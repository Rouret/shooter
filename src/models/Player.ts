import {BoostTypes} from "./BoostTypes";
import Coordinate from "./Coordinate";

export default class Player {
  id: string;
  name: string;
  color: string;
  coordinate: Coordinate;
  mouse: Coordinate;
  speed: number;
  score: number;
  size: number;
  clientDim: any;
  effect: any;

  constructor(id, window, name, color) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.coordinate = new Coordinate(0, 0);
    this.mouse = new Coordinate(0, 0);
    this.speed = 2;
    this.score = 0;
    this.size = 25;
    this.clientDim = {
      width: window.width,
      height: window.height,
    };
    this.effect = null;
  }

  isCollidingWith(bullets) {
    for (let bullet of bullets) {
      if (
        bullet.player.id !== this.id &&
        bullet.current.x >= this.coordinate.x - this.size / 2 &&
        bullet.current.x <= this.coordinate.x + this.size / 2 &&
        bullet.current.y >= this.coordinate.y - this.size / 2 &&
        bullet.current.y <= this.coordinate.y + this.size / 2
      ) {
        return bullet;
      }
    }
    return null;
  }

  isCollidingWithBoost(boosts) {
    for (let boost of boosts) {
      if (
        boost.id !== this.id &&
        this.coordinate.x >= boost.x - boost.size / 2 &&
        this.coordinate.x <= boost.x + boost.size / 2 &&
        this.coordinate.y >= boost.y - boost.size / 2 &&
        this.coordinate.y <= boost.y + boost.size / 2
      ) {
        return boost;
      }
    }
    return null;
  }

  setEffect(effect) {
    console.log("OUI")
    this.effect = effect;

    switch (effect) {
        case BoostTypes.SPEED:
            this.speed += 1;
    }
  }

  removeEffect() {
    switch (this.effect) {
      case BoostTypes.SPEED:
        this.speed = 2;
    }
    this.effect = null;
  }
}