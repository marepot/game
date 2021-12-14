var plan = [
  "############################",
  "#      #    #      o      ##",
  "#                          #",
  "#          #####           #",
  "##         #   #    ##     #",
  "###           ##     #     #",
  "#           ###      #     #",
  "#   ####                   #",
  "#   ##       o             #",
  "# o  #         o       ### #",
  "#    #                     #",
  "############################"];

function Vector(x, y) {
  this.x = x;
  this.y = y;
}
Vector.prototype.plus = function (other) {
  return new Vector(this.x + other.x, this.y + other.y);
};

function Grid(width, height) {
  this.space = new Array(width * height);
  this.width = width;
  this.height = height;
}
Grid.prototype.isInside = function (vector) {
  return vector.x >= 0 && vector.x < this.width &&
    vector.y >= 0 && vector.y < this.height;
};
Grid.prototype.get = function (vector) {
  return this.space[vector.x + this.width * vector.y];
};
Grid.prototype.set = function (vector, value) {
  this.space[vector.x + this.width * vector.y] = value;
};

var directions = {
  "n": new Vector(0, -1),
  "ne": new Vector(1, -1),
  "e": new Vector(1, 0),
  "se": new Vector(1, 1),
  "s": new Vector(0, 1),
  "sw": new Vector(-1, 1),
  "w": new Vector(-1, 0),
  "nw": new Vector(-1, -1)
};

function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

var directionNames = "n ne e se s sw w nw".split(" ");

function BouncingCritter() {
  this.direction = randomElement(directionNames);
};

BouncingCritter.prototype.act = function (view) {
  if (view.look(this.direction) != " ")
    this.direction = view.find(" ") || "s";
  return { type: "move", direction: this.direction };
};

function elementFromChar(legend, ch) {
  if (ch == " ")
    return null;
  var element = new legend[ch]();
  element.originChar = ch;
  return element;
}

function World(map, legend) {
  var grid = new Grid(map[0].length, map.length);
  this.grid = grid;
  this.legend = legend;

  map.forEach(function (line, y) {
    for (var x = 0; x < line.length; x++)
      grid.set(new Vector(x, y),
        elementFromChar(legend, line[x]));
  });
}

function charFromElement(element, asHTML) {
  var content;
  content = element === null ? " " : element.originChar;
  if (asHTML) {
    var style = element?.style;
    var originHTML = element?.originHTML;
    if (!style) {
      style = '';
    }
    content = `<div style="width: 20px; height: 20px; ${style}">${originHTML ? originHTML : ('<pre>' + content + '</pre>')}</div>`;
  }
  return content;
}

World.prototype.toString = function (asHTML = false) {
  var output = "";
  for (var y = 0; y < this.grid.height; y++) {
    for (var x = 0; x < this.grid.width; x++) {
      var element = this.grid.get(new Vector(x, y));
      output += charFromElement(element, asHTML);
    }
    output += "\n";
  }
  if (asHTML) {
    output = `<div class="world" style="grid-template-columns: repeat(${this.grid.width},minmax(0,20px));">${output}</div>`;
  }
  return output;
};

function Wall() {
  this.style = "color: brown; background-image: url(./wall.png)";
  this.originHTML = '&nbsp;';
}
function Ground() {
  this.style = "background-image: url(./ground.png);"
  this.originHTML = '&nbsp;';
}
Ground.prototype.act = function () {

}
var world = new World(plan, {
  "#": Wall,
  "o": BouncingCritter
});
//   #      #    #      o      ##
//   #                          #
//   #          #####           #
//   ##         #   #    ##     #
//   ###           ##     #     #
//   #           ###      #     #
//   #   ####                   #
//   #   ##       o             #
//   # o  #         o       ### #
//   #    #                     #
//   ############################

Grid.prototype.forEach = function (f, context) {
  for (var y = 0; y < this.height; y++) {
    for (var x = 0; x < this.width; x++) {
      var value = this.space[x + y * this.width];
      if (value != null)
        f.call(context, value, new Vector(x, y));
    }
  }
};

World.prototype.turn = function () {
  var acted = [];
  this.grid.forEach(function (critter, vector) {
    if (critter.act && acted.indexOf(critter) == -1) {
      acted.push(critter);
      this.letAct(critter, vector);
    }
  }, this);
};

World.prototype.letAct = function (critter, vector) {
  var action = critter.act(new View(this, vector));
  if (action && action.type == "move") {
    var dest = this.checkDestination(action, vector);
    if (dest && this.grid.get(dest) == null) {
      this.grid.set(vector, null);
      this.grid.set(dest, critter);
    }
  }
};

World.prototype.checkDestination = function (action, vector) {
  if (directions.hasOwnProperty(action.direction)) {
    var dest = vector.plus(directions[action.direction]);
    if (this.grid.isInside(dest))
      return dest;
  }
};

function View(world, vector) {
  this.world = world;
  this.vector = vector;
}
View.prototype.look = function (dir) {
  var target = this.vector.plus(directions[dir]);
  if (this.world.grid.isInside(target))
    return charFromElement(this.world.grid.get(target));
  else
    return "#";
};
View.prototype.findAll = function (ch) {
  var found = [];
  for (var dir in directions)
    if (this.look(dir) == ch)
      found.push(dir);
  return found;
};
View.prototype.find = function (ch) {
  var found = this.findAll(ch);
  if (found.length == 0) return null;
  return randomElement(found);
};

function dirPlus(dir, n) {
  var index = directionNames.indexOf(dir);
  return directionNames[(index + n + 8) % 8];
}

function WallFollower() {
  this.dir = "s";

}

WallFollower.prototype.act = function (view) {
  var start = this.dir;
  if (view.look(dirPlus(this.dir, -3)) != " ")
    start = this.dir = dirPlus(this.dir, -2);
  while (view.look(this.dir) != " ") {
    this.dir = dirPlus(this.dir, 1);
    if (this.dir == start) break;
  }
  return { type: "move", direction: this.dir };
};

function LifelikeWorld(map, legend) {
  World.call(this, map, legend);
}
LifelikeWorld.prototype = Object.create(World.prototype);

var actionTypes = Object.create(null);

LifelikeWorld.prototype.letAct = function (critter, vector) {
  var action = critter.act(new View(this, vector));
  var handled = action &&
    action.type in actionTypes &&
    actionTypes[action.type].call(this, critter,
      vector, action);
  if (!handled) {
    critter.energy -= 0.2;
    if (critter.energy <= 0)
      this.grid.set(vector, null);
  }
};

actionTypes.grow = function (critter) {
  critter.energy += 0.5;
  return true;
};

actionTypes.move = function (critter, vector, action) {
  var dest = this.checkDestination(action, vector);
  if (dest == null ||
    critter.energy <= 1 ||
    this.grid.get(dest) != null)
    return false;
  critter.energy -= 1;
  this.grid.set(vector, null);
  this.grid.set(dest, critter);
  return true;
};

actionTypes.eat = function (critter, vector, action) {
  var dest = this.checkDestination(action, vector);
  var atDest = dest != null && this.grid.get(dest);
  if (!atDest || atDest.energy == null)
    return false;
  critter.energy += atDest.energy;
  this.grid.set(dest, null);
  return true;
};

actionTypes.reproduce = function (critter, vector, action) {
  var baby = elementFromChar(this.legend,
    critter.originChar);
  var dest = this.checkDestination(action, vector);
  if (dest == null ||
    critter.energy <= 2 * baby.energy ||
    this.grid.get(dest) != null)
    return false;
  critter.energy -= 2 * baby.energy;
  this.grid.set(dest, baby);
  return true;
};

function Plant() {
  this.energy = 3 + Math.random() * 4;
  this.style = "color: green; background-image: url(./grass.png)";
  this.originHTML = '&nbsp;';
}
/*class AbstractWorldObject{
  constructor(){

  }
  html(content,style){
    return '<div style="${style}>${content}</div>';
  }
}
class Wall extends AbstractWorldObject{
  constructor(){
    super.constructor();

    
  }
  style(){
    return this.energy<="color:brown;";
  }
  html(){
    return super.html(this.style(),'<img src="./wall.png">');
  }
}
class Plant extends AbstractWorldObject{
  constructor(){
    super.constructor();

    this.energy = 3 + Math.random() * 4;
  }
  style(){
    return this.energy<=7?"color: green;":"color:red;";
  }
  html(){
    return super.html(this.style(),'<img src="./grass.png">');
  }
}
class SmartPlantEater extends AbstractWorldObject{
  constructor(){
    super.constructor();

    this.energy = 30
    this.direction = randomElement(directionNames)
  
  }
  style(){
    return "color: grey;";
  }
  html(){
    return super.html(this.style(),'<img src="./cow.png">');
  }
  class Tiger extends AbstractWorldObject{
  constructor(){
    super.constructor();

    this.energy = 80
    this.direction = randomElement(directionNames)
    this.preySeen = [];
  }
  style(){
    return "color: orange;";
  }
  html(){
    return super.html(this.style(),'<img src="./tiger.png">');
  }
}*/
Plant.prototype.act = function (view) {
  if (this.energy > 20) {
    var space = view.find(" ");
    if (space)
      return { type: "reproduce", direction: space };
  }
  if (this.energy < 30)
    return { type: "grow" };
};

function PlantEater() {
  this.energy = 20;
  this.style = "color: red;";

}
PlantEater.prototype.act = function (view) {
  var space = view.find(" ");
  if (this.energy > 60 && space)
    return { type: "reproduce", direction: space };
  var plant = view.find("*");
  if (plant)
    return { type: "eat", direction: plant };
  if (space)
    return { type: "move", direction: space };
};


var valley = new LifelikeWorld(
  ["####################################################",
    "#                 ####         ****              ###",
    "#   *  @  ##                 ########     @ OO    ##",
    "#   *    ##        O O                 ****       *#",
    "#   O   ##*                        ##########     *#",
    "#      ##***  *         ****                     **#",
    "#* **  #  *  ***      #########                  **#",
    "#* **  #      *               #   *              **#",
    "#     ##              #   O   #  ***          ######",
    "#*   O        @       #       #   *        O  #    #",
    "#*                    #  ######                 ** #",
    "###          ****          ***                  ** #",
    "#       O                        @         O       #",
    "#   *     ##  ##  ##  ##               ###      *  #",
    "#   **         #              *       #####  O     #",
    "##  **  O   O  #  #    ***  ***        ###      ** #",
    "###               #   *****         O          ****#",
    "####################################################"],
  {
    "#": Wall,
    "@": Tiger,
    "O": SmartPlantEater,
    "*": Plant,
    " ": Ground
  }
);
function SmartPlantEater() {
  this.energy = 30
  this.direction = randomElement(directionNames)
  this.style = "color: grey; background-image: url(./cow.png);";
  this.originHTML = '&nbsp;';
}
SmartPlantEater.prototype.act = function (context) {
  const space = context.find(" ");
  if (this.energy > 90 && space) {
    return { type: "reproduce", direction: space }
  }
  const plants = context.findAll("*")
  if (plants.length > 1) {
    return { type: "eat", direction: randomElement(plants) }
  }
  if (space) {
    const dir = context.look(this.direction) === " " ? this.direction : space
    return { type: "move", direction: dir }
  }

}
function Tiger() {
  this.energy = 80
  this.direction = randomElement(directionNames);
  this.preySeen = [];
  this.style = "color: orange; background-image: url(./tiger.png);";
  this.originHTML = '&nbsp;';
}
Tiger.prototype.act = function (view) {
  var seenPerTurn = this.preySeen.reduce(function (a, b) {
    return a + b;
  }, 0) / this.preySeen.length;
  var prey = view.findAll("O");
  this.preySeen.push(prey.length);
  if (this.preySeen.length > 6)
    this.preySeen.shift();
  if (prey.length && seenPerTurn > 0.25)
    return { type: "eat", direction: randomElement(prey) };
  var space = view.find(" ");
  if (this.energy > 90 && space)
    return { type: "reproduce", direction: space };
  if (view.look(this.direction) != " " && space)
    this.direction = space;
  return { type: "move", direction: this.direction };
};