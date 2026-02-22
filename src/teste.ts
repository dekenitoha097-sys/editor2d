// Main entry point - initializes and runs the game engine

import { Engine } from "./engine.js"
import { RectangleObject, SpriteObject } from "./game-objects.js";
import { CircleObject } from "./game-objects.js";
import { ImageRectangleObject } from "./game-objects.js";

// Get the canvas element from the HTML document
const canvas = document.getElementById("canvas") as HTMLCanvasElement

// Create a new engine instance with the canvas
const engine = new Engine(canvas);

const rect = new RectangleObject(200, 100, 100, 30, "blue");
engine.addObjets(rect);

const circle = new CircleObject(300, 300, 30, "green")
engine.addObjets(circle);

const image = new ImageRectangleObject(400, 100, 200, 300, "../resources/image.png");
engine.addObjets(image)

// Sprite example with two rectangles
const destinationRect = new RectangleObject(150, 150, 64, 64, "");
const sourceRect = new RectangleObject(1*250, 2*256, 250, 256, "");

const sprite = new SpriteObject(destinationRect, sourceRect, "../resources/image.png");
engine.addObjets(sprite);

// Start the game loop
engine.start()
