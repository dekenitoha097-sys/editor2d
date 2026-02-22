// Main entry point - initializes and runs the game engine

import { Engine } from "./engine.js"

// Get the canvas element from the HTML document
const canvas = document.getElementById("canvas") as HTMLCanvasElement

// Create a new engine instance with the canvas
const engine = new Engine(canvas);


// Render the initial frame
engine.Render()