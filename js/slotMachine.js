class SlotMachine {
  constructor(container, specs) {
    this.container = container;
    this.specs = specs;
    this.isSpinning = false;
    this.currentIndex = 0;
    this.spinInterval = null;
  }

  createSlotItem(spec) {
    return `<div class="slot-item" style="color: ${spec.classColor}">
            ${spec.class} - ${spec.specialization} (${spec.role})
        </div>`;
  }

  async spin() {
    if (this.isSpinning) return;
    this.isSpinning = true;

    const duration = 4000; // 4 seconds
    const startSpeed = 50; // Start fast
    const endSpeed = 300; // End slow
    let currentSpeed = startSpeed;
    let elapsedTime = 0;

    // Select the winning spec beforehand
    const winningSpec =
      this.specs[Math.floor(Math.random() * this.specs.length)];

    return new Promise((resolve) => {
      this.spinInterval = setInterval(() => {
        elapsedTime += currentSpeed;

        // Calculate speed based on elapsed time
        const progress = Math.min(elapsedTime / duration, 1);
        currentSpeed = startSpeed + (endSpeed - startSpeed) * progress;

        // Update display
        this.currentIndex = (this.currentIndex + 1) % this.specs.length;
        this.container.innerHTML = this.createSlotItem(
          this.specs[this.currentIndex],
        );

        // Check if we should stop
        if (elapsedTime >= duration) {
          clearInterval(this.spinInterval);
          this.container.innerHTML = this.createSlotItem(winningSpec);
          this.isSpinning = false;
          resolve(winningSpec);
        }
      }, currentSpeed);
    });
  }
}
