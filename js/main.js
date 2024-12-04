document.addEventListener("DOMContentLoaded", async () => {
  let specs = [];
  let currentRoleCount = {};
  let usedSpecs = new Set();

  // Fetch the specs data
  try {
    const response = await fetch("data/roles.json");
    const data = await response.json();
    specs = data.specs;
  } catch (error) {
    console.error("Error loading specs:", error);
  }

  const container = document.querySelector(".container");
  const namesContainer = document.querySelector(".names-container");
  const addNameButton = document.querySelector(".add-name");
  const rollButton = document.querySelector(".roll-button");
  const resultsContainer = document.querySelector(".results-container");
  const actionButtons = document.querySelector(".action-buttons");

  document.querySelector(".comp-text").textContent = "Group comp can be modified with more than one name";

  function createNameEntry() {
    const template = document.querySelector(".name-entry");
    const newEntry = template.cloneNode(true);

    // Clear any existing values
    newEntry.querySelector(".player-name").value = "";
    newEntry.querySelector(".selected-specs").innerHTML = "";
    newEntry
      .querySelectorAll(".role-toggle input")
      .forEach((input) => (input.checked = false));

    // Hide exclusions by default
    newEntry.querySelector(".exclusions").classList.add("hidden");

    setupSpecSelector(newEntry);
    setupRoleToggles(newEntry);

    // Add enter key handler for the name input
    const nameInput = newEntry.querySelector(".player-name");
    nameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (
          nameInput.value.trim() &&
          document.querySelectorAll(".name-entry").length < 40
        ) {
          addNameButton.click();
          setTimeout(() => {
            const inputs = document.querySelectorAll(".player-name");
            inputs[inputs.length - 1].focus();
          }, 0);
        }
      }
    });

    return newEntry;
  }

  function updateRecommendedComposition() {
    const nameCount = document.querySelectorAll(".name-entry").length;
    const compText = document.querySelector(".comp-text");
    const balancedTeamCheckbox = document.querySelector("#balanced-team");
    const minimumRolesCheckbox = document.querySelector("#minimum-roles");
    const minimumRolesConfig = document.querySelector(".minimum-roles-config");
    const balancedTeamLabel = balancedTeamCheckbox.parentElement;
    const minimumRolesLabel = minimumRolesCheckbox.parentElement;

    // Reset balanced team checkbox if number of players doesn't meet criteria
    if (nameCount !== 5 && nameCount < 10) {
      balancedTeamCheckbox.checked = false;
      balancedTeamCheckbox.disabled = true;
      balancedTeamLabel.classList.remove("available");
    }

    if (nameCount === 1) {
      compText.textContent =
        "Group comp can be modified with more than one name";
      balancedTeamCheckbox.disabled = true;
      minimumRolesCheckbox.disabled = true;
      minimumRolesConfig.classList.add("hidden");
      balancedTeamLabel.classList.remove("available");
      minimumRolesLabel.classList.remove("available");
    } else if (nameCount === 5) {
      compText.textContent = "Balanced Comp: 1 Tank, 1 Healer, 3 DPS";
      balancedTeamCheckbox.disabled = false;
      minimumRolesCheckbox.disabled = false;
      balancedTeamLabel.classList.add("available");
      minimumRolesLabel.classList.add("available");
    } else if (nameCount >= 10) {
      const dpsCount = Math.floor((nameCount - 2) * 0.75);
      const healerCount = Math.max(2, Math.floor(dpsCount / 3));
      compText.textContent = `Balanced Comp: 2 Tanks, ${healerCount} Healers, ${dpsCount} DPS`;
      balancedTeamCheckbox.disabled = false;
      minimumRolesCheckbox.disabled = false;
      balancedTeamLabel.classList.add("available");
      minimumRolesLabel.classList.add("available");
    } else if (
      (nameCount >= 2 && nameCount <= 4) ||
      (nameCount >= 6 && nameCount <= 9)
    ) {
      compText.textContent =
        "Balanced comp available for dungeon (5) and raid (10+) sized groups";
      minimumRolesCheckbox.disabled = false;
      minimumRolesLabel.classList.add("available");
      balancedTeamCheckbox.disabled = true;
      balancedTeamLabel.classList.remove("available");
    }

    // Update duplicate specs warning
    updateDuplicatesWarning();
  }

  function updateDuplicatesWarning() {
    const nameCount = document.querySelectorAll(".name-entry").length;
    const allowDuplicates = document.querySelector("#allow-duplicates");

    // Check if elements exist before proceeding
    if (!allowDuplicates) return;

    const warningDiv =
      allowDuplicates.parentElement.querySelector(".duplicate-warning");
    if (!warningDiv) return;

    if (nameCount > 20) {
      allowDuplicates.checked = true;
      allowDuplicates.disabled = true;
      warningDiv.textContent = "Too many players to disable duplicates";
      warningDiv.classList.remove("hidden");
    } else if (nameCount > 10) {
      allowDuplicates.disabled = false;
      warningDiv.textContent =
        "Warning: Disabling duplicates with many players could limit variety";
      warningDiv.classList.remove("hidden");
    } else {
      allowDuplicates.disabled = false;
      warningDiv.classList.add("hidden");
    }
  }

  function setupMinimumRoles() {
    const minimumRolesCheckbox = document.querySelector("#minimum-roles");
    const balancedTeamCheckbox = document.querySelector("#balanced-team");
    const minimumRolesConfig = document.querySelector(".minimum-roles-config");
    const roleInputs = document.querySelectorAll(".role-input input");
    const rolesSummary = document.querySelector(".roles-summary");

    minimumRolesCheckbox.addEventListener("change", () => {
      if (minimumRolesCheckbox.checked) {
        balancedTeamCheckbox.checked = false;
        balancedTeamCheckbox.disabled = true;
        minimumRolesConfig.classList.remove("hidden");
        updateRolesSummary();
      } else {
        balancedTeamCheckbox.disabled = false;
        minimumRolesConfig.classList.add("hidden");
        // Reset values when hiding
        roleInputs.forEach((input) => {
          input.value = "0";
        });
      }
    });

    balancedTeamCheckbox.addEventListener("change", () => {
      if (balancedTeamCheckbox.checked) {
        minimumRolesCheckbox.checked = false;
        minimumRolesCheckbox.disabled = true;
        minimumRolesConfig.classList.add("hidden");
        // Reset values when hiding
        roleInputs.forEach((input) => {
          input.value = "0";
        });
      } else {
        minimumRolesCheckbox.disabled = false;
      }
    });

    roleInputs.forEach((input) => {
      input.addEventListener("input", () => {
        // Ensure non-negative values
        if (input.value < 0) input.value = 0;
        updateRolesSummary();
      });
    });

    function updateRolesSummary() {
      const nameCount = document.querySelectorAll(".name-entry").length;
      const tanks = parseInt(document.querySelector("#min-tanks").value) || 0;
      const healers =
        parseInt(document.querySelector("#min-healers").value) || 0;
      const dps = parseInt(document.querySelector("#min-dps").value) || 0;
      const total = tanks + healers + dps;
      const remaining = nameCount - total;

      if (total > nameCount) {
        rolesSummary.innerHTML = `<span class="error-text">Total roles (${total}) exceeds number of players (${nameCount})</span>`;
        return false;
      }

      rolesSummary.textContent = `${remaining} roles will be randomly assigned`;
      return true;
    }

    return { updateRolesSummary };
  }

  function setupAdvancedOptions() {
    const toggleButton = document.querySelector(
      ".advanced-options-toggle .toggle-button",
    );
    const advancedOptions = document.querySelector(".advanced-options");
    const allowExclusions = document.querySelector("#allow-exclusions");
    const autoProgress = document.querySelector("#auto-progress");
    const allowDuplicates = document.querySelector("#allow-duplicates");

    // Set default values
    autoProgress.checked = true;
    allowDuplicates.checked = true;

    // Toggle advanced options panel
    toggleButton.addEventListener("click", () => {
      toggleButton.classList.toggle("active");
      advancedOptions.classList.toggle("hidden");
      const icon = toggleButton.querySelector(".toggle-icon");
      icon.style.transform = advancedOptions.classList.contains("hidden")
        ? "rotate(0deg)"
        : "rotate(90deg)";
    });

    // Handle exclusions visibility
    allowExclusions.addEventListener("change", () => {
      document.querySelectorAll(".exclusions").forEach((exclusion) => {
        exclusion.classList.toggle("hidden", !allowExclusions.checked);
      });
    });

    // Handle auto-progress changes
    autoProgress.addEventListener("change", () => {
      const nextRollContainer = document.querySelector(".next-roll-container");
      if (autoProgress.checked && nextRollContainer) {
        nextRollContainer.style.display = "none";
      }
    });

    // Initial warning setup
    updateDuplicatesWarning();
  }

  function getBalancedRoles(nameCount) {
    if (!document.querySelector("#balanced-team").checked) {
      return null;
    }

    if (nameCount === 5) {
      return {
        Tank: 1,
        Healer: 1,
        DPS: 3,
      };
    } else if (nameCount >= 10) {
      const dpsCount = Math.floor((nameCount - 2) * 0.75);
      const healerCount = Math.max(2, Math.floor(dpsCount / 3));
      return {
        Tank: 2,
        Healer: healerCount,
        DPS: dpsCount,
      };
    }

    return null;
  }

  function setupSpecSelector(entry) {
    const button = entry.querySelector(".spec-selector");
    const dropdown = entry.querySelector(".spec-dropdown");
    const search = entry.querySelector(".spec-search");
    const specList = entry.querySelector(".spec-list");
    const selectedSpecs = entry.querySelector(".selected-specs");

    // Clear and populate spec list
    specList.innerHTML = "";
    specs.forEach((spec) => {
      const div = document.createElement("div");
      div.className = "spec-option";
      div.textContent = `${spec.class} - ${spec.specialization}`;
      div.style.color = spec.classColor;
      div.dataset.spec = JSON.stringify(spec);
      specList.appendChild(div);
    });

    button.addEventListener("click", () => {
      dropdown.classList.toggle("hidden");
    });

    search.addEventListener("input", (e) => {
      const searchText = e.target.value.toLowerCase();
      specList.querySelectorAll(".spec-option").forEach((option) => {
        const text = option.textContent.toLowerCase();
        option.style.display = text.includes(searchText) ? "block" : "none";
      });
    });

    specList.addEventListener("click", (e) => {
      if (e.target.classList.contains("spec-option")) {
        const spec = JSON.parse(e.target.dataset.spec);
        const specString = `${spec.class} - ${spec.specialization}`;

        const existingPills = Array.from(selectedSpecs.children);
        const isAlreadySelected = existingPills.some(
          (pill) =>
            pill.textContent.trim().replace("×", "").trim() === specString,
        );

        if (!isAlreadySelected) {
          addSpecPill(selectedSpecs, spec);
        }

        dropdown.classList.add("hidden");
        search.value = "";
        specList.querySelectorAll(".spec-option").forEach((option) => {
          option.style.display = "block";
        });
      }
    });

    document.addEventListener("click", (e) => {
      if (!entry.contains(e.target)) {
        dropdown.classList.add("hidden");
        search.value = "";
        specList.querySelectorAll(".spec-option").forEach((option) => {
          option.style.display = "block";
        });
      }
    });
  }

  function addSpecPill(container, spec) {
    const pill = document.createElement("div");
    pill.className = "spec-pill";
    pill.style.backgroundColor = spec.classColor;
    pill.style.color = getContrastColor(spec.classColor);
    pill.innerHTML = `
            ${spec.class} - ${spec.specialization}
            <span class="remove">×</span>
        `;

    pill
      .querySelector(".remove")
      .addEventListener("click", () => pill.remove());
    container.appendChild(pill);
  }

  function setupRoleToggles(entry) {
    const toggles = entry.querySelectorAll(".role-toggle input");
    toggles.forEach((toggle) => {
      toggle.addEventListener("change", () => {
        const checked = Array.from(toggles).filter((t) => t.checked);
        if (checked.length === toggles.length) {
          toggle.checked = false;
        }
      });
    });
  }

  function getContrastColor(hexcolor) {
    const r = parseInt(hexcolor.substr(1, 2), 16);
    const g = parseInt(hexcolor.substr(3, 2), 16);
    const b = parseInt(hexcolor.substr(5, 2), 16);

    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "#000000" : "#ffffff";
  }

  function validateNames() {
    const entries = document.querySelectorAll(".name-entry");
    let valid = true;

    entries.forEach((entry) => {
      const input = entry.querySelector(".player-name");
      const error = entry.querySelector(".error");
      if (error) error.remove();

      if (!input.value.trim()) {
        const errorDiv = document.createElement("div");
        errorDiv.className = "error";
        errorDiv.textContent = "Name is required";
        input.parentElement.appendChild(errorDiv);
        valid = false;
      }
    });

    return valid;
  }

  function getExcludedSpecs(entry) {
    if (!document.querySelector("#allow-exclusions").checked) {
      return [];
    }
    return Array.from(entry.querySelectorAll(".spec-pill")).map((pill) =>
      pill.textContent.trim().replace("×", "").trim(),
    );
  }

  function getExcludedRoles(entry) {
    if (!document.querySelector("#allow-exclusions").checked) {
      return [];
    }
    return Array.from(entry.querySelectorAll(".role-toggle input:checked")).map(
      (input) => input.value,
    );
  }

  async function rollForPlayer(
    nameEntry,
    targetRoles,
    currentIndex,
    totalEntries,
  ) {
    const name = nameEntry.querySelector(".player-name").value;
    const excludedSpecs = getExcludedSpecs(nameEntry);
    const excludedRoles = getExcludedRoles(nameEntry);
    const allowDuplicates = document.querySelector("#allow-duplicates").checked;
    const minimumRolesEnabled =
      document.querySelector("#minimum-roles").checked;

    let availableSpecs = specs.filter((spec) => {
      const specString = `${spec.class} - ${spec.specialization}`;
      const roleExcluded = excludedRoles.includes(spec.role);
      const specExcluded = excludedSpecs.includes(specString);
      const isDuplicate = !allowDuplicates && usedSpecs.has(specString);

      if (minimumRolesEnabled) {
        const tanks = parseInt(document.querySelector("#min-tanks").value) || 0;
        const healers =
          parseInt(document.querySelector("#min-healers").value) || 0;
        const dps = parseInt(document.querySelector("#min-dps").value) || 0;

        const needTank = currentRoleCount.Tank < tanks;
        const needHealer = currentRoleCount.Healer < healers;
        const needDPS = currentRoleCount.DPS < dps;

        if (needTank && spec.role === "Tank")
          return !roleExcluded && !specExcluded && !isDuplicate;
        if (needHealer && spec.role === "Healer")
          return !roleExcluded && !specExcluded && !isDuplicate;
        if (needDPS && spec.role === "DPS")
          return !roleExcluded && !specExcluded && !isDuplicate;

        if (
          (needTank || needHealer || needDPS) &&
          ((spec.role === "Tank" && !needTank) ||
            (spec.role === "Healer" && !needHealer) ||
            (spec.role === "DPS" && !needDPS))
        ) {
          return false;
        }
      } else if (targetRoles) {
        const roleAvailable =
          currentRoleCount[spec.role] < targetRoles[spec.role];
        return !roleExcluded && !specExcluded && !isDuplicate && roleAvailable;
      }

      return !roleExcluded && !specExcluded && !isDuplicate;
    });

    if (availableSpecs.length === 0) {
      if (!allowDuplicates) {
        const errorDiv = document.createElement("div");
        errorDiv.className = "error";
        errorDiv.textContent =
          "No unique specs available. Enabling duplicates to continue.";
        resultsContainer.appendChild(errorDiv);

        document.querySelector("#allow-duplicates").checked = true;
        usedSpecs.clear(); // Reset used specs

        // Rerun the filter without duplicate checking
        availableSpecs = specs.filter((spec) => {
          const specString = `${spec.class} - ${spec.specialization}`;
          const roleExcluded = excludedRoles.includes(spec.role);
          const specExcluded = excludedSpecs.includes(specString);

          if (targetRoles) {
            const roleAvailable =
              currentRoleCount[spec.role] < targetRoles[spec.role];
            return !roleExcluded && !specExcluded && roleAvailable;
          }

          return !roleExcluded && !specExcluded;
        });
      } else {
        availableSpecs = specs; // Fallback to all specs if no valid options
      }
    }

    const resultCard = document.createElement("div");
    resultCard.className = "result-card";

    let cardContent = `<h3>${name}</h3>`;

    if (
      (excludedSpecs.length > 0 || excludedRoles.length > 0) &&
      document.querySelector("#allow-exclusions").checked
    ) {
      cardContent += '<div class="exclusion-summary">';

      if (excludedSpecs.length > 0) {
        cardContent += '<div class="excluded-specs">Excluded specs: ';
        excludedSpecs.forEach((specString) => {
          const spec = specs.find(
            (s) => `${s.class} - ${s.specialization}` === specString,
          );
          if (spec) {
            cardContent += `
                            <span class="excluded-spec"
                                  style="background-color: ${spec.classColor};
                                         color: ${getContrastColor(spec.classColor)}">
                                ${specString}
                            </span>`;
          }
        });
        cardContent += "</div>";
      }

      if (excludedRoles.length > 0) {
        cardContent += '<div class="excluded-roles">Excluded roles: ';
        excludedRoles.forEach((role) => {
          cardContent += `<span class="excluded-role">${role}</span>`;
        });
        cardContent += "</div>";
      }

      cardContent += "</div>";
    }

    cardContent += '<div class="slot-machine"></div>';
    resultCard.innerHTML = cardContent;
    resultsContainer.appendChild(resultCard);

    const slotMachine = new SlotMachine(
      resultCard.querySelector(".slot-machine"),
      availableSpecs,
    );
    const result = await slotMachine.spin();

    if (targetRoles) {
      currentRoleCount[result.role]++;
    }

    // Add the selected spec to used specs set
    if (!allowDuplicates) {
      usedSpecs.add(`${result.class} - ${result.specialization}`);
    }

    const nextRollContainer = document.querySelector(".next-roll-container");

    if (!document.querySelector("#auto-progress").checked) {
      if (currentIndex < totalEntries - 1) {
        nextRollContainer.style.display = "block";
        return new Promise((resolve) => {
          const nextButton = document.querySelector(".next-roll-button");
          nextButton.disabled = false;
          const clickHandler = () => {
            nextButton.disabled = true;
            nextButton.removeEventListener("click", clickHandler);
            resolve();
          };
          nextButton.addEventListener("click", clickHandler);
        });
      } else {
        nextRollContainer.style.display = "none";
      }
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  addNameButton.addEventListener("click", () => {
    const nameCount = document.querySelectorAll(".name-entry").length;
    if (nameCount >= 40) {
      alert("Maximum of 40 names allowed");
      return;
    }

    namesContainer.appendChild(createNameEntry());
    updateRecommendedComposition();

    const removeButtons = document.querySelectorAll(".remove-name");
    removeButtons.forEach(
      (button) =>
        (button.style.display =
          document.querySelectorAll(".name-entry").length > 1
            ? "block"
            : "none"),
    );

    // Update exclusions visibility based on current setting
    const allowExclusions = document.querySelector("#allow-exclusions").checked;
    document.querySelectorAll(".exclusions").forEach((exclusion) => {
      exclusion.classList.toggle("hidden", !allowExclusions);
    });
  });

  namesContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-name")) {
      const nameEntries = document.querySelectorAll(".name-entry");
      if (nameEntries.length > 1) {
        e.target.closest(".name-entry").remove();
      } else {
        const input = nameEntries[0].querySelector(".player-name");
        input.value = "";
      }

      updateRecommendedComposition();

      const removeButtons = document.querySelectorAll(".remove-name");
      removeButtons.forEach(
        (button) =>
          (button.style.display =
            document.querySelectorAll(".name-entry").length > 1
              ? "block"
              : "none"),
      );
    }
  });

  rollButton.addEventListener("click", async () => {
    if (!validateNames()) return;

    // Clear used specs set
    usedSpecs.clear();

    // Hide input section and roll button
    namesContainer.classList.add("hidden");
    addNameButton.classList.add("hidden");
    rollButton.classList.add("hidden");
    document.querySelector(".group-comp-options").classList.add("hidden");
    document.querySelector(".advanced-options-toggle").classList.add("hidden");
    document.querySelector(".advanced-options").classList.add("hidden");

    resultsContainer.innerHTML = "";
    rollButton.disabled = true;
    addNameButton.disabled = true;

    const nameEntries = document.querySelectorAll(".name-entry");
    const targetRoles = getBalancedRoles(nameEntries.length);

    // Reset role counter for balanced team
    currentRoleCount = { Tank: 0, Healer: 0, DPS: 0 };

    // Initialize the Next Roll button
    const nextRollContainer = document.querySelector(".next-roll-container");
    nextRollContainer.style.display = "none";

    for (let i = 0; i < nameEntries.length; i++) {
      await rollForPlayer(nameEntries[i], targetRoles, i, nameEntries.length);
    }

    // Show action buttons and options sections after all rolls are complete
    actionButtons.style.display = "flex";
    rollButton.disabled = false;
    addNameButton.disabled = false;
    document.querySelector(".group-comp-options").classList.remove("hidden");
    document
      .querySelector(".advanced-options-toggle")
      .classList.remove("hidden");
  });

  document.querySelector(".roll-again").addEventListener("click", () => {
    // Show input section and buttons but maintain their values
    namesContainer.classList.remove("hidden");
    addNameButton.classList.remove("hidden");
    rollButton.classList.remove("hidden");
    document.querySelector(".group-comp-options").classList.remove("hidden");
    document
      .querySelector(".advanced-options-toggle")
      .classList.remove("hidden");

    // Clear previous results
    resultsContainer.innerHTML = "";
    actionButtons.style.display = "none";

    // Clear used specs set for new roll
    usedSpecs.clear();

    // Trigger the roll
    rollButton.click();
  });

  document.querySelector(".reset").addEventListener("click", () => {
    // Show all sections
    namesContainer.classList.remove("hidden");
    addNameButton.classList.remove("hidden");
    rollButton.classList.remove("hidden");
    document.querySelector(".group-comp-options").classList.remove("hidden");
    document
      .querySelector(".advanced-options-toggle")
      .classList.remove("hidden");

    resultsContainer.innerHTML = "";
    actionButtons.style.display = "none";

    // Reset to single empty name entry
    const nameEntries = document.querySelectorAll(".name-entry");
    nameEntries.forEach((entry, index) => {
      if (index === 0) {
        entry.querySelector(".player-name").value = "";
        entry.querySelector(".selected-specs").innerHTML = "";
        entry
          .querySelectorAll(".role-toggle input")
          .forEach((input) => (input.checked = false));
      } else {
        entry.remove();
      }
    });

    // Clear used specs set
    usedSpecs.clear();

    // Reset all advanced options to defaults
    document.querySelector("#auto-progress").checked = true;
    document.querySelector("#allow-duplicates").checked = true;
    document.querySelector("#allow-duplicates").disabled = false;
    document.querySelector("#balanced-team").checked = false;
    document.querySelector("#minimum-roles").checked = false;
    document.querySelector("#allow-exclusions").checked = false;
    document.querySelector(".duplicate-warning").classList.add("hidden");
    document.querySelector(".minimum-roles-config").classList.add("hidden");
    document.querySelectorAll(".role-input input").forEach((input) => {
      input.value = "0";
    });

    // Hide exclusions
    document.querySelectorAll(".exclusions").forEach((exclusion) => {
      exclusion.classList.add("hidden");
    });

    document.querySelector(".remove-name").style.display = "none";
    document.querySelector(".next-roll-container").style.display = "none";
    updateRecommendedComposition();
  });

  // Initial setup
  setupAdvancedOptions();
  setupMinimumRoles();
  setupSpecSelector(document.querySelector(".name-entry"));
  setupRoleToggles(document.querySelector(".name-entry"));
});
