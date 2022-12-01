class Player {
  constructor(id) {
    this.id = id;
    this.x = 0;
    this.y = 0;
    this.mouse = {
      x: 0,
      y: 0,
    };
    this.color = "#" + Math.floor(Math.random() * 16777215).toString(16);
    this.speed = 3;
  }

  isCollidingWith(bullets) {
    for (let i = 0; i < bullets.length; i++) {
      const bullet = bullets[i];
      if (
        bullet.player.id != this.id &&
        bullet.current.x >= this.x - PLAYER_SIZE / 2 &&
        bullet.current.x <= this.x + PLAYER_SIZE / 2 &&
        bullet.current.y >= this.y - PLAYER_SIZE / 2 &&
        bullet.current.y <= this.y + PLAYER_SIZE / 2
      ) {
        return true;
      }
    }
    return false;
  }
}

module.exports = Player;
