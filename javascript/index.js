let gamespace = {

  // constants, or it would be, if properties could be constant.
  constants: {
    backgroundFileWidth: 6000,
    backgroundFileHeight: 1200,
    playerSize: 50,
    entitySize: 30,
    tickRate: 5,
  },

  // non-persistant variables.
  sessionVariables: {
    active: false,
    background: undefined,
    player: undefined,
    score: 0,
    drawEntities: [],
  },

  // presistant variables.
  localVariables: {
    playerSkin: ["image/player/player1.png", 0],
    backgroundLayer1: "image/map/map1a.png",
    backgroundLayer2: "image/map/map1b.png",
    backgroundLayer3: "image/map/map1c.png",
    level: 1,
    highScore: 0,
    scale: 1,
  },

  // canvas element, will be modified later
  canvas: document.createElement("canvas"),

  /**
   * This is the class for the player. It contains methods to control gravity, drawing, etc.
   */
  player: class {
    constructor(image) {
      this.element = gamespace.imageToElement(image);
      this.width = 40;
      this.height = 40;
      this.x = 50;
      this.y = 50;
      this.health = 3;
      this.gravity = 0;
      this.momentum = 0;
      this.pull = 1; // fall increase
      this.acceleration = 1.1; // gravity fall speed multiplier
      this.airResistance = 0.9; // gravity rise speed loss
      this.bounceLoss = 0.5; // gravity lost from bouncing of floor
      this.wallLoss = 0.5; // gravity lost from bouncing of wall
      this.moving = true;
    }
    draw() {
      gamespace.canvas
        .getContext("2d")
        .drawImage(this.element, this.x, this.y, this.width, this.height);
    }
    control(gravityPower, momentumPower) {
      this.gravity += gravityPower;
      this.momentum += momentumPower;
    }
    /**
     * Controls gravity on the player.
     */
    physics() {
      if (this.moving) {
        let nx = this.x + this.momentum;
        let ny = this.y + this.gravity;

        if (this.gravity === 0 && ny < gamespace.canvas.height - this.height) {
          this.gravity = 1;
        }
        if (ny < gamespace.canvas.height - this.height && this.gravity > 0) {
          this.gravity = this.gravity * this.acceleration + this.pull;
        }
        if (ny < gamespace.canvas.height - this.height && this.gravity < 0) {
          this.gravity = this.gravity * this.airResistance + this.pull;
        }
        if (nx < 0) {
          this.momentum = -this.momentum * this.wallLoss;
          nx = 0;
        }
        if (nx > gamespace.canvas.width - this.width) {
          this.momentum = -this.momentum * this.wallLoss;
          nx = gamespace.canvas.width - this.width;
        }
        if (ny < 0) {
          this.gravity = -this.gravity * this.bounceLoss;
          ny = 0;
        }
        if (ny > gamespace.canvas.height - this.height) {
          this.gravity = -this.gravity * this.bounceLoss;
          ny = gamespace.canvas.height - this.height;
        }
        this.x = nx;
        this.y = ny;
      }
    }
    find() {
      return [this.x, this.y];
    }
    /**
     * Adjusts the player health. Supports positive and negative integers.
     * @param {number} amount The amount to adjust the player health by.
     */
    healthChange(amount) {
      this.health += amount;
      const hp = document.createElement("img");
      hp.src = "image/entity/entityHealth.png";
      hp.classList.add("interface_health_element");
      const parent = document.getElementById("hpBar");
      while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
      }
      for (let i = 0; i < this.health; i++) {
        document.getElementById("hpBar").appendChild(hp.cloneNode());
      }
      if (this.health < 1) {
        gamespace.toggleInterface();
        gamespace.gameEnd("You lose");
      }
    }
  },

  /**
   * The class for the various "entities", or NPCs.
   */
  entity: class {
    constructor(
      element,
      width,
      height,
      movementType,
      moveSpeed,
      startPosY,
      danger,
      score
    ) {
      this.width = width;
      this.height = height;
      this.x = gamespace.canvas.width;
      this.y = startPosY;
      this.element = element;
      this.score = score;
      this.danger = danger;
      this.type = movementType;
      this.speed = moveSpeed;
      this.gravity = 2;
    }
    draw() {
      gamespace.canvas
        .getContext("2d")
        .drawImage(this.element, this.x, this.y, this.width, this.height);
    }
    checkCollision() {
      if (
        gamespace.sessionVariables.player.x +
          gamespace.sessionVariables.player.width >=
          this.x &&
        gamespace.sessionVariables.player.x <= this.x + this.width &&
        gamespace.sessionVariables.player.y <= this.y + this.height &&
        gamespace.sessionVariables.player.y +
          gamespace.sessionVariables.player.height >=
          this.y
      ) {
        return 1;
      } else if (this.x < -this.width) {
        return 2;
      } else {
        return 0;
      }
    }
    control() {
      if (this.type === 0) {
        this.x = this.x - this.speed;
        return this.checkCollision();
      } else if (this.type === 1) {
        this.x = this.x - this.speed;
        return this.checkCollision();
      } else if (this.type === 2) {
        this.x = this.x - this.speed;
        this.y = this.y - this.gravity;
        if (this.y <= 0 || this.y >= gamespace.canvas.height - this.height) {
          this.gravity = -this.gravity;
        }
        return this.checkCollision();
      }
    }
  },

  /**
   * The class for the moving background.
   */
  background: class {
    constructor(bgLayer, mgLayer, fgLayer) {
      this.bgLayer = gamespace.imageToElement(bgLayer);
      this.mgLayer = gamespace.imageToElement(mgLayer);
      this.fgLayer = gamespace.imageToElement(fgLayer);
      this.height = gamespace.canvas.height;
      this.width =
        gamespace.constants.backgroundFileWidth *
        (gamespace.canvas.height / gamespace.constants.backgroundFileHeight);
      this.bgx = 0;
      this.mgx = 0;
      this.fgx = 0;
      this.yPos =
        gamespace.canvas.height - gamespace.constants.backgroundDetailHeight;
      this.ctx = gamespace.canvas.getContext("2d");
      this.ctx.mozImageSmoothingEnabled = false;
      this.ctx.webkitImageSmoothingEnabled = false;
      this.ctx.msImageSmoothingEnabled = false;
      this.ctx.imageSmoothingEnabled = false;
    }
    /**
     * "Scrolls" image.
     */
    update() {
      if (this.bgx <= -this.width) {
        this.bgx = 0;
      }
      if (this.mgx <= -this.width) {
        this.mgx = 0;
      }
      if (this.fgx <= -this.width) {
        this.fgx = 0;
      }
      this.bgx -= 1;
      this.mgx -= 2;
      this.fgx -= 3;
    }

    /**
     * Draws the background background image layer.
     */
    drawBg() {
      this.ctx.drawImage(this.bgLayer, this.bgx, 0, this.width, this.height);
      if (this.bgx < gamespace.canvas.width - this.width) {
        this.ctx.drawImage(
          this.bgLayer,
          this.bgx + this.width,
          0,
          this.width,
          this.height
        );
      }
      this.ctx.drawImage(this.mgLayer, this.mgx, 0, this.width, this.height);
      if (this.mgx < gamespace.canvas.width - this.width) {
        this.ctx.drawImage(
          this.mgLayer,
          this.mgx + this.width,
          0,
          this.width,
          this.height
        );
      }
    }

    /**
     * Draws the background foreground image layer.
     */
    drawFg() {
      this.ctx.drawImage(this.fgLayer, this.fgx, 0, this.width, this.height);
      if (this.fgx < gamespace.canvas.width - this.width) {
        this.ctx.drawImage(
          this.fgLayer,
          this.fgx + this.width,
          0,
          this.width,
          this.height
        );
      }
    }
  },

  /**
   * Accepts image path, returns image element, if used with canvas, remember to wait for onload, or rerender.
   * @param {string} src The path to the image.
   * @returns An image element consiting of the source image.
   */
  imageToElement: function (src) {
    let image = new Image();
    image.src = src;
    return image;
  },

  /**
   * Readies canvas for use and adds it to the document.
   */
  setupCanvas: function () {
    this.canvas.style.backgroundColor = "#333";
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.canvas.getContext("2d");
    document.getElementById("gameContainer").prepend(this.canvas);
  },

  /**
   * Loads locally stored variables.
   * @param {string} skinOnly Whetever to load only the skin or not.
   */
  setupLocalVariables: function (skinOnly) {
    if (localStorage.getItem("highScore") > 0) {
      gamespace.localVariables.highScore = localStorage.getItem("highScore");
      document.getElementById("highScore").innerText =
        localStorage.getItem("highScore");
    }
    // recursive function that sets player skin
    if (
      !localStorage.getItem("playerSkinTexture") ||
      !localStorage.getItem("playerSkinNumber")
    ) {
      localStorage.setItem("playerSkinTexture", "/image/player/player1.png");
      localStorage.setItem("playerSkinNumber", "1");
      this.setupLocalVariables();
    } else {
      this.localVariables.playerSkin[0] =
        localStorage.getItem("playerSkinTexture");
      this.localVariables.playerSkin[1] =
        localStorage.getItem("playerSkinNumber");
      document.getElementById("playerView").src =
        localStorage.getItem("playerSkinTexture");
      document.querySelectorAll(".gamePlayerSelector").forEach((element) => {
        if (element.dataset.number === this.localVariables.playerSkin[1]) {
          element.classList.add("focuscolor");
        }
      });
    }
    // recursive function that sets background
    if (!localStorage.getItem("currentBackgroundNumber")) {
      localStorage.setItem("currentBackgroundNumber", "1");
      this.setupLocalVariables();
    } else if (!skinOnly) {
      this.setBackgroundImages(localStorage.getItem("currentBackgroundNumber"));
      this.setBackground();
      document.querySelectorAll(".gameMapSelector").forEach((element) => {
        if (
          element.dataset.number ===
          localStorage.getItem("currentBackgroundNumber")
        ) {
          element.classList.add("focuscolor");
        }
      });
    }
  },

  /**
   * Add event listeners to menu.
   */
  setupMenuListners: function () {
    document.getElementById("gameButtonStart").addEventListener(
      "click",
      function () {
        gamespace.gameStart();
      },
      false
    );

    document.getElementById("gameOver").addEventListener("click", (event) => {
      this.toggleGameOverView();
      this.toggleMenu();
    }),
      // adds event listner that sets player skin in storage and current
      document.querySelectorAll(".gamePlayerSelector").forEach((element) => {
        element.addEventListener("click", (event) => {
          if (
            event.target.dataset.number !=
            localStorage.getItem("playerSkinNumber")
          ) {
            localStorage.setItem("playerSkinTexture", event.target.src);
            localStorage.setItem(
              "playerSkinNumber",
              event.target.dataset.number
            );
            document
              .querySelectorAll(".gamePlayerSelector")
              .forEach((element) => {
                element.classList.remove("focuscolor");
              });
            this.setupLocalVariables(true);
          }
        });
      });

    document.querySelectorAll(".gameMapSelector").forEach((element) => {
      element.addEventListener("click", (event) => {
        if (
          event.target.dataset.number !=
            localStorage.getItem("currentBackgroundNumber")) {
          localStorage.setItem(
            "currentBackgroundNumber",
            event.target.dataset.number
          );
          document.querySelectorAll(".gameMapSelector").forEach((element) => {
            element.classList.remove("focuscolor");
          });
          this.setupLocalVariables();
        }
      });
    });
  },

  /**
   * Controls the entity functions, such as collisions.
   */
  controldrawEntities: function () {
    if (this.sessionVariables.active) {
      for (i = 0; i < gamespace.sessionVariables.drawEntities.length; i++) {
        switch (gamespace.sessionVariables.drawEntities[i].control()) {
          // nothing
          case 0:
            break;
          // player score and remove
          case 1:
            if (
              gamespace.sessionVariables.drawEntities[i].danger === "health"
            ) {
              gamespace.sessionVariables.player.healthChange(1);
              gamespace.sessionVariables.drawEntities.splice(i, 1);
            } else if (gamespace.sessionVariables.drawEntities[i].danger) {
              gamespace.sessionVariables.player.healthChange(-1);
              gamespace.sessionVariables.drawEntities.splice(i, 1);
            } else {
              gamespace.sessionVariables.score +=
                gamespace.sessionVariables.drawEntities[i].score;
              document.getElementById("gameScore").textContent =
                gamespace.sessionVariables.score;
              gamespace.sessionVariables.drawEntities.splice(i, 1);
            }
            break;
          // remove only
          case 2:
            gamespace.sessionVariables.drawEntities.splice(i, 1);
            break;
          default:
            console.log("ERROR IN AI: CASE NOT FOUND");
        }
      }
    }
  },

  /**
   * Controls spawning of various non-player entities.
   */
  spawn: function () {
    if (gamespace.sessionVariables.active) {
      if (gamespace.localVariables.level < 100) {
        gamespace.localVariables.level += 0.004;
      }
      spawnNumber = Math.floor(Math.random() * 1000);
      moveSpeed = Math.floor(Math.random() * 5 + 1);
      randomYcordinate = Math.floor(Math.random() * gamespace.canvas.height);
      if (spawnNumber < 3 && gamespace.sessionVariables.player.health < 3) {
        gamespace.sessionVariables.drawEntities.push(
          new gamespace.entity(
            gamespace.imageToElement("image/entity/entityHealth.png"),
            48,
            48,
            1,
            moveSpeed,
            Math.floor(Math.random() * (gamespace.canvas.height - 48)),
            "health",
            1
          )
        );
      } else if (spawnNumber < 10) {
        gamespace.sessionVariables.drawEntities.push(
          new gamespace.entity(
            gamespace.imageToElement("image/entity/entityStraight.png"),
            48,
            48,
            1,
            moveSpeed,
            Math.floor(Math.random() * (gamespace.canvas.height - 48)),
            false,
            1
          )
        );
      } else if (spawnNumber < 10 + 1 * gamespace.localVariables.level) {
        gamespace.sessionVariables.drawEntities.push(
          new gamespace.entity(
            gamespace.imageToElement("image/entity/entityBouncing.png"),
            48,
            48,
            1,
            moveSpeed,
            Math.floor(Math.random() * (gamespace.canvas.height - 48)),
            false,
            5
          )
        );
      } else if (spawnNumber < 10 + 1.5 * gamespace.localVariables.level) {
        gamespace.sessionVariables.drawEntities.push(
          new gamespace.entity(
            gamespace.imageToElement("image/entity/entityFast.png"),
            48,
            48,
            1,
            moveSpeed,
            Math.floor(Math.random() * (gamespace.canvas.height - 48)),
            false,
            10
          )
        );
      } else if (spawnNumber < 10 + 1.7 * gamespace.localVariables.level) {
        gamespace.sessionVariables.drawEntities.push(
          new gamespace.entity(
            gamespace.imageToElement("image/entity/entityStraightBad.png"),
            96,
            64,
            0,
            moveSpeed,
            gamespace.canvas.height - 52,
            true,
            0
          )
        );
      } else if (spawnNumber < 10 + 1.8 * gamespace.localVariables.level) {
        gamespace.sessionVariables.drawEntities.push(
          new gamespace.entity(
            gamespace.imageToElement("image/entity/entityFastBad.png"),
            128,
            64,
            0,
            moveSpeed,
            Math.floor(Math.random() * (gamespace.canvas.height - 64)),
            true,
            0
          )
        );
      } else if (spawnNumber < 10 + 1.9 * gamespace.localVariables.level) {
        gamespace.sessionVariables.drawEntities.push(
          new gamespace.entity(
            gamespace.imageToElement("image/entity/entityBouncingBad.png"),
            116,
            104,
            2,
            moveSpeed,
            Math.floor(Math.random() * (gamespace.canvas.height - 104)),
            true,
            0
          )
        );
      }
    }
  },

  /**
   * Toggle menu visibility.
   */
  toggleMenu: function () {
    document.querySelectorAll(".hidable").forEach((element) => {
      if (element.classList.contains("no_display")) {
        element.classList.remove("no_display");
      } else {
        element.classList.add("no_display");
      }
    });
  },
  /**
   * Toggle interface visibility.
   */
  toggleInterface: function () {
    document.querySelectorAll(".hidableInterface").forEach((element) => {
      if (element.classList.contains("no_display")) {
        element.classList.remove("no_display");
      } else {
        element.classList.add("no_display");
      }
    });
  },

  /**
   * Touch controlls for player.
   */
  setupControllers: function () {
    function verticalAction(intensity) {
      if (gamespace.sessionVariables.active) {
        gamespace.sessionVariables.player.control(intensity, 0);
      }
    }
    function horizontalAction(intensity) {
      if (gamespace.sessionVariables.active) {
        gamespace.sessionVariables.player.control(0, intensity);
      }
    }

    touchStartPosX = null;
    touchStartPosY = null;
    touchMovePosX = null;
    touchMovePosY = null;
    hasMoved = false;
    window.addEventListener("touchstart", function (e) {
      touchStartPosX = e.touches[0].screenX;
      touchStartPosY = e.touches[0].screenY;
      if (gamespace.sessionVariables.active) {
        gamespace.sessionVariables.player.moving = false;
        gamespace.sessionVariables.player.gravity = 0;
        gamespace.sessionVariables.player.momentum = 0;
      }
    });
    window.addEventListener("touchmove", function (e) {
      touchMovePosX = e.touches[0].screenX;
      touchMovePosY = e.touches[0].screenY;
      hasMoved = true;
    });
    window.addEventListener("touchend", function (e) {
      if (gamespace.sessionVariables.active) {
        gamespace.sessionVariables.player.moving = true;
      }
      intensityX = 0;
      intensityY = 0;
      function diff(num1, num2) {
        if (num1 > num2) {
          return num1 - num2;
        } else {
          return num2 - num1;
        }
      }
      intensityX = diff(touchStartPosX, touchMovePosX) / 10;
      intensityY = diff(touchStartPosY, touchMovePosY) / 5;
      if (hasMoved) {
        if (gamespace.sessionVariables.active) {
          if (touchStartPosX < touchMovePosX) {
            if (gamespace.sessionVariables.player.momentum < 0) {
              gamespace.sessionVariables.player.momentum = 0;
            }
            horizontalAction(intensityX);
          }
          if (touchStartPosX > touchMovePosX) {
            if (gamespace.sessionVariables.player.momentum > 0) {
              gamespace.sessionVariables.player.momentum = 0;
            }
            horizontalAction(-intensityX);
          }
          if (touchStartPosY > touchMovePosY) {
            if (gamespace.sessionVariables.player.gravity > 0) {
              gamespace.sessionVariables.player.gravity = 0;
            }
            verticalAction(-intensityY);
          }
          if (touchStartPosY < touchMovePosY) {
            if (gamespace.sessionVariables.player.gravity < 0) {
              gamespace.sessionVariables.player.gravity = 0;
            }
            verticalAction(intensityY);
          }
        }
        hasMoved = false;
      }
    });
    window.addEventListener("touchcancel", function (e) {
      touchStartPosX = null;
      touchStartPosY = null;
      touchMovePosX = null;
      touchMovePosY = null;
      if (gamespace.sessionVariables.active) {
        gamespace.sessionVariables.player.gravity = 1;
        gamespace.sessionVariables.player.moving = true;
      }
    });
  },

  /**
   * Mouse controlls for player.
   */
  setupMouseControllers: function () {
    function verticalAction(intensity) {
      if (gamespace.sessionVariables.active) {
        gamespace.sessionVariables.player.control(intensity, 0);
      }
    }
    function horizontalAction(intensity) {
      if (gamespace.sessionVariables.active) {
        gamespace.sessionVariables.player.control(0, intensity);
      }
    }

    touchStartPosX = null;
    touchStartPosY = null;
    touchMovePosX = null;
    touchMovePosY = null;
    hasMoved = false;
    window.addEventListener("mousedown", function (e) {
      touchStartPosX = e.screenX;
      touchStartPosY = e.screenY;
      if (gamespace.sessionVariables.active) {
        gamespace.sessionVariables.player.moving = false;
        gamespace.sessionVariables.player.gravity = 0;
        gamespace.sessionVariables.player.momentum = 0;
      }
    });
    window.addEventListener("mousemove", function (e) {
      touchMovePosX = e.screenX;
      touchMovePosY = e.screenY;
      hasMoved = true;
    });
    window.addEventListener("mouseup", function (e) {
      if (gamespace.sessionVariables.active) {
        gamespace.sessionVariables.player.moving = true;
      }
      intensityX = 0;
      intensityY = 0;
      function diff(num1, num2) {
        if (num1 > num2) {
          return num1 - num2;
        } else {
          return num2 - num1;
        }
      }
      intensityX = diff(touchStartPosX, touchMovePosX) / 10;
      intensityY = diff(touchStartPosY, touchMovePosY) / 5;
      if (hasMoved) {
        if (gamespace.sessionVariables.active) {
          if (touchStartPosX < touchMovePosX) {
            if (gamespace.sessionVariables.player.momentum < 0) {
              gamespace.sessionVariables.player.resetMomentum();
            }
            horizontalAction(intensityX);
          }
          if (touchStartPosX > touchMovePosX) {
            if (gamespace.sessionVariables.player.momentum > 0) {
              gamespace.sessionVariables.player.resetMomentum();
            }
            horizontalAction(-intensityX);
          }
          if (touchStartPosY > touchMovePosY) {
            if (gamespace.sessionVariables.player.gravity > 0) {
              gamespace.sessionVariables.player.resetGravity();
            }
            verticalAction(-intensityY);
          }
          if (touchStartPosY < touchMovePosY) {
            if (gamespace.sessionVariables.player.gravity < 0) {
              gamespace.sessionVariables.player.resetGravity();
            }
            verticalAction(intensityY);
          }
        }
        hasMoved = false;
      }
    });
    window.addEventListener("mouseleave", function (e) {
      touchStartPosX = null;
      touchStartPosY = null;
      touchMovePosX = null;
      touchMovePosY = null;
      if (gamespace.sessionVariables.active) {
        gamespace.sessionVariables.player.gravity = 1;
        gamespace.sessionVariables.player.moving = true;
      }
    });
  },

  /**
   * Updates?
   */
  update: function () {
    if (this.background != undefined) {
      this.sessionVariables.background.update();
    }
    if (
      this.sessionVariables.player != undefined &&
      this.sessionVariables.active
    ) {
      this.sessionVariables.player.physics();
    }
  },

  /**
   * Draws the player, entities, and background. Order is important.
   */
  render: function () {
    if (this.background != undefined) {
      this.sessionVariables.background.drawBg();
    }
    if (
      this.sessionVariables.player != undefined &&
      this.sessionVariables.active
    ) {
      this.sessionVariables.player.draw();
    }
    if (
      this.sessionVariables.player != undefined &&
      this.sessionVariables.active
    ) {
      this.sessionVariables.player.draw();
    }
    for (i = 0; i < gamespace.sessionVariables.drawEntities.length; i++) {
      gamespace.sessionVariables.drawEntities[i].draw();
    }
    if (this.background != undefined) {
      this.sessionVariables.background.drawFg();
    }
  },

  /**
   * Storres the selected map.
   * @param {number} number 
   */
  setBackgroundImages: function (number) {
    gamespace.localVariables.backgroundLayer1 =
      "image/map/map" + number + "a.png";
    gamespace.localVariables.backgroundLayer2 =
      "image/map/map" + number + "b.png";
    gamespace.localVariables.backgroundLayer3 =
      "image/map/map" + number + "c.png";
  },

  /**
   * Sets the background, or "map" variables based on stored data.
   */
  setBackground: function () {
    this.sessionVariables.background = new this.background(
      gamespace.localVariables.backgroundLayer1,
      gamespace.localVariables.backgroundLayer2,
      gamespace.localVariables.backgroundLayer3
    );
  },

  /**
   * Starts the match, toggling backgrounds setting states.
   */
  gameStart: function () {
    document.getElementById("gameMenu").classList.remove("overlaybackground");
    document.getElementById("gameMenu").classList.add("fadeout");
    window.setTimeout(function () {
      document.getElementById("gameMenu").classList.remove("fadeout");
      document.getElementById("gameMenu").classList.add("overlaybackground");
      gamespace.toggleMenu();
      gamespace.toggleInterface();
    }, 200);
    this.sessionVariables.player = new this.player(
      this.localVariables.playerSkin[0]
    );
    this.sessionVariables.active = true;
    this.sessionVariables.player.healthChange(0);
  },

  /**
   * Resets the game.
   */
  reset: function () {
    this.sessionVariables.score = 0;
    this.sessionVariables.active = false;
    this.sessionVariables.drawEntities = [];
    this.sessionVariables.player = undefined;
  },

  /**
   * Ends the match, and saves high score.
   */
  gameEnd: function () {
    if (gamespace.sessionVariables.score > localStorage.getItem("highScore")) {
      localStorage.setItem("highScore", gamespace.sessionVariables.score);
      document.getElementById("highScore").innerText =
        gamespace.sessionVariables.score;
      this.toggleGameOverView(true);
    } else {
      this.toggleGameOverView(false);
    }
    this.reset();
  },

  /**
   * Toggles the game over screen, displaying score.
   * @param {number} highScore The achived score.
   */
  toggleGameOverView(highScore) {
    const parentElement = document.getElementById("gameOver");

    document.getElementById("gameOver").classList.add("fadein");
    window.setTimeout(function () {
      document.getElementById("gameOver").classList.remove("fadein");
    }, 1000);

    if (parentElement.classList.contains("no_display")) {
      parentElement.classList.remove("no_display");

      document.querySelectorAll(".messagePoints").forEach((element) => {
        element.textContent = gamespace.sessionVariables.score;
      });
      if (highScore) {
        document.getElementById("messageScore").classList.add("no_display");
        document
          .getElementById("messageHighScore")
          .classList.remove("no_display");
      } else {
        document.getElementById("messageHighScore").classList.add("no_display");
        document.getElementById("messageScore").classList.remove("no_display");
      }
      parentElement.classList.remove("no_display");
    } else {
      parentElement.classList.add("no_display");
    }
  },

  /**
   * Controls the "tickrate" of the game.
   */
  manageIntervals: function () {
    update = window.setInterval(function () {
      gamespace.update();
      gamespace.controldrawEntities();
      gamespace.spawn();
    }, 30);
    render = window.setInterval(function () {
      gamespace.render();
    }, 15);
  },
};

/**
 * Initializes game.
 */
function onDeviceReady() {
  gamespace.setupCanvas();
  gamespace.setupLocalVariables();
  gamespace.setupMenuListners();
  gamespace.setupControllers();
  gamespace.setupMouseControllers();
  gamespace.setBackground();
  gamespace.manageIntervals();
}

window.addEventListener("load", (event) => {
  onDeviceReady();
});
