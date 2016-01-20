Bot = {
    name: 'TestBot',
    image: '/media/mario.png',
    init: function() {
        this.shots = 0;
    },
    update: function(pos, health, reload, bots, bullets) {
        if (reload > 0) {
            return DoNothing;
        }
        if (pos.x === 50 && this.shots === 0) {
            this.shots++;
            return Shoot(135);
        }
        if (pos.x === 60 && this.shots === 1) {
            this.shots++;
            return Shoot(135);
        }
        if (pos.x === 70 && this.shots === 2) {
            this.shots++;
            return Shoot(135);
        }
        if (pos.x === 70 && this.shots === 3) {
            this.shots++;
            return Shoot(135);
        }
        if (pos.x === 70 && this.shots === 4) {
            this.shots++;
            return Shoot(135);
        }
        return MoveRight;
    }
};
