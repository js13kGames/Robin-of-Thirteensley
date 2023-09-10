
const enum GuyState {
  Limbo,
  Idle,
  Walk,
  Jump,
  Fall,
  Garde,
  Advance,
  Lunge,
  DrawGarde,
  DrawIdle,
  Knockback,
  Celebrate,
  Fake,
  Parry,
}


const guyGardeSmall = 26;
const guyGardeLarge = 52;

const guyAnimRed = makeAnim(guyData);
recolorCels(guyAnimRed, 6);

const guy = {
  anim: guyAnim,
  inst: makeAnimInstance(guyTags.idle, AnimStyle.Loop),
  x: 10, y: 8,
  facing: 1,
  w: 2, h: 12,
  dx: 0, dy: 0,
  timer: 0,
  jumpCount: 0,
  lastFloor: 0,
  stat: GuyState.Idle,

  gardeCheck: { x: 0, y: 0, w: guyGardeSmall, h: 12 },
  focus: 0 as (Enemy | 0),
  fallTransition: GuyState.Fall,
  beforeJump: GuyState.Idle,

  attackBox: 0 as (Capsule | 0),
  parryBox: 0 as (Capsule | 0),

  inGarde: false,
  parryTime: 0,
  wasParried: false,
  
  damage: [] as Enemy[],
  health: 3,
}


type Guy = typeof guy;
let firstGuy = true;
let spawnGuyLoc: [number, number] | 0 = 0;
let guyRequestedState: GuyState | null = null;
let guyCelebratePosition: WorldCoordinates = [0, 0];

function tickGuy(guy: Guy) {
  const speed = 500 * ds;

  const floor = max(findFloor([guy.x - 2, guy.y]), findFloor([guy.x + 2, guy.y]));

  const jump = (): boolean => {
    if (justPressed[Keys.Up] && guy.jumpCount < 2) {
      if (!guy.jumpCount) {
        guy.beforeJump = guy.stat;
      }
      guy.y += 0.1;
      guy.dy = 150;
      guy.jumpCount++;
      guy.fallTransition = GuyState.Fall;
      return true;
    }
    return false;
  }

  const horizontal = (mult: number): boolean => {
    if (pressed[Keys.Left]) {
      guy.dx -= speed * mult;
      return true;
    }
    if (pressed[Keys.Right]) {
      guy.dx += speed * mult;
      return true;
    }
    return false;
  }

  const fall = () => {
    if (guy.y > floor || guy.dy != 0) {
      guy.dy -= ds * 500;
      guy.y += guy.dy * ds;
      if (guy.dy < 0) {
        toState(guy.fallTransition);
      }
      return true;
    }
    return false;
  }

  const land = (): boolean => {
    if (guy.y <= floor && guy.dy <= 0) {
      guy.y = floor;
      guy.dy = 0;
      guy.lastFloor = floor;
      guy.jumpCount = 0;
      if (guy.beforeJump !== GuyState.Knockback) {
        guitarTwoStrings(guitar1);
      }
      return true;
    }
    return false;
  }

  const checkGardeBox = (): boolean => {
    let detected = false;
    enemies.forEach(e => {
      if (e.fighter && e.actv && intersectCapsules(e, guy.gardeCheck)) {
        detected = true;
      }
    })
    return detected;
  }

  const checkEnterGarde = () => {
    if (checkGardeBox()) {
      if (!guy.inGarde) {
        activeChord = chordEm7;
      }
      guy.inGarde = true;
      toState(GuyState.DrawGarde);
      guy.gardeCheck.w = guyGardeLarge;
    }
  }

  const checkExitGarde = () => {
    if (!checkGardeBox()) {
      if (guy.inGarde) {
        activeChord = chordG;
      }
      guy.inGarde = false;
      toState(GuyState.DrawIdle);
      guy.gardeCheck.w = guyGardeSmall;
    }
  }

  const checkAttack = (): boolean => {
    return justPressed[Keys.Attack] ? toState(GuyState.Lunge) : false;
  }

  const checkFake = (): boolean => {
    return justPressed[Keys.Down] ? toState(GuyState.Fake) : false;
  }

  const checkParry = (): boolean => {
    return justPressed[Keys.Up] ? toState(GuyState.Parry) : false;
  }

  const checkRPS = (): boolean => {
    return checkAttack() || checkFake() || checkParry();
  }

  const takeDamage = () => {
    console.log(guy.health, guy.damage.length)
    if (guy.damage.length > 0) {
      guy.health -= 1;
      if (guy.health <= 0) {
        sceneDeath();
      } 
    }
    guy.damage.map(d => {
      toState(GuyState.Knockback);
      guy.dx = guy.x < d.x ? -150 : 150;
      guy.dy = 100;
    })
  } 

  const faceFocus = () => {
    let f = guy.focus;
    if (f !== 0) {
      guy.facing = guy.x < f.x ? 1 : -1;
    }
  }

  const absx = abs(guy.dx * ds);

  const toState = (stat: GuyState) => {
    if (guy.stat === stat) return;
    guy.anim = guyAnim;
    guy.stat = stat;
    guy.timer = 0;
    //console.log(`guy to stat ${stat}`);
    switch (stat) {
      case GuyState.Idle:
        animInstanceSetRange(guy.inst, guyTags.idle, AnimStyle.Loop);
        if (absx > 0.2) { toState(GuyState.Walk); }
        checkEnterGarde();
        break;
      case GuyState.Walk:
        animInstanceSetRange(guy.inst, guyTags.run, AnimStyle.Loop);
        break;
      case GuyState.Jump:
        guitarSingleString(guitar1, [0, 1]);
        animInstanceResetRange(guy.inst, guyTags.jump, AnimStyle.Loop);
        break;
      case GuyState.Fall:
        animInstanceSetRange(guy.inst, guyTags.fall, AnimStyle.Loop);
        break;
      case GuyState.Garde:
        animInstanceSetRange(guy.inst, guyTags.garde, AnimStyle.Loop);
        break;
      case GuyState.Advance:
        animInstanceSetRange(guy.inst, guyTags.advance, AnimStyle.Loop);
        break;
      case GuyState.Lunge:
        guy.dx = guy.facing * (clck - guy.parryTime < 2 ? 250 : 175);
        animInstanceResetRange(guy.inst, guyTags.lunge, AnimStyle.NoLoop);
        break;
      case GuyState.Fake:
        guy.dx = guy.facing * 75;
        animInstanceResetRange(guy.inst, guyTags.fake, AnimStyle.NoLoop);
        break;
      case GuyState.Parry:
        guy.dx = guy.facing * -10;
        animInstanceResetRange(guy.inst, guyTags.parry, AnimStyle.NoLoop);
        break;
      case GuyState.DrawGarde:
        animInstanceResetRange(guy.inst, guyTags.draw, AnimStyle.NoLoop);
        break;
      case GuyState.DrawIdle:
        animInstanceResetRange(guy.inst, guyTags.draw, AnimStyle.NoLoop);
        break;
      case GuyState.Knockback:
        guy.beforeJump = GuyState.Knockback;
        activeChord = chordGm;
        guitarPluck(guitar1, chordGm, 1);
        guy.anim = guyAnimRed;
        guy.fallTransition = GuyState.Knockback;
        animInstanceSetRange(guy.inst, guyTags.fall, AnimStyle.Loop);
        break;
      case GuyState.Celebrate:
        animInstanceSetRange(guy.inst, guyTags.victory, AnimStyle.Loop);
        break;
    }
    return true;
  }

  if (firstGuy) {
    toState(GuyState.Garde);
    firstGuy = false;
  }

  if (spawnGuyLoc) {
    toState(GuyState.Idle);
    guy.x = spawnGuyLoc[0];
    guy.y = spawnGuyLoc[1];
    guy.dx = 0;
    guy.dy = 0;
    guy.lastFloor = findFloor([guy.x, guy.y]);
    guy.health = 3;
    cameraCutTo(guy.x, guy.y);
    spawnGuyLoc = 0;
  }

  let closestDist = 9999999;
  let closest: Enemy | 0 = 0;
  enemies.forEach(e => {
    if (e.danger && e.actv) {
      let dx = abs(e.x - guy.x);
      let dy = abs(e.y - guy.y);
      if (dx < closestDist && dy < 16) {
        closestDist = dx;
        closest = e;
      }
    }
  })
  guy.focus = closest;

  guy.timer += ds;

  if (guyRequestedState !== null) {
    toState(guyRequestedState);
    guyRequestedState = null;
  }

  guy.inst.onLoop = () => { };

  const walkPing = () => {
    guitarSingleString(guitar1, [3, 4]);
  }

  let canFace = true;
  guy.attackBox = 0;
  guy.parryBox = 0;
  guy.wasParried = false;
  switch (guy.stat) {
    case GuyState.Idle:
      if (horizontal(1)) toState(GuyState.Walk);
      if (jump()) toState(GuyState.Jump);
      checkEnterGarde();
      fall();
      break;
    case GuyState.Walk:
      guy.inst.onLoop = walkPing;
      if (guy.timer > 0.25) {
        reportEvent(EventTypes.Move);
      }
      horizontal(1);
      if (absx < 0.1) toState(GuyState.Idle);
      if (jump()) toState(GuyState.Jump);
      checkEnterGarde();
      fall();
      break;
    case GuyState.Jump:
      horizontal(0.75);
      fall();
      jump();
      break;
    case GuyState.Fall:
      fall();
      if (land()) { toState(GuyState.Idle) }
      else if (jump()) { toState(GuyState.Jump) }
      break;
    case GuyState.Garde:
      reportEvent(EventTypes.GuyGarde);
      canFace = false;
      faceFocus();
      if (horizontal(0.5)) toState(GuyState.Advance);
      checkRPS()
      checkExitGarde();
      takeDamage();
      fall();
      break;
    case GuyState.Advance:
      guy.inst.onLoop = walkPing;
      canFace = false;
      faceFocus();
      horizontal(0.5);
      if (absx < 0.1) toState(GuyState.Garde);
      checkRPS()
      checkExitGarde();
      takeDamage();
      fall();
      break;
    case GuyState.Lunge:
      canFace = false;
      takeDamage();
      if (animIsRelativeFrame(guy.inst, 0)) {
        guy.attackBox = { x: guy.x + guy.facing * 8, y: guy.y, w: 9, h: 12 };
      }
      if (animIsFinished(guy)) toState(GuyState.Garde)
      if (guy.wasParried) {
        toState(GuyState.Knockback);
        guy.dx = guy.facing * 50;
        guy.dy = 50;
      }
      break;
    case GuyState.Fake:
      canFace = false;
      takeDamage();
      if (animIsFinished(guy)) toState(GuyState.Garde)
      break;
    case GuyState.Parry:
      canFace = false;
      if (animIsRelativeFrame(guy.inst, 0)) {
        guy.parryBox = { x: guy.x + guy.facing * 5, y: guy.y, w: 6, h: 12 };
      }
      if (animIsFinished(guy)) toState(GuyState.Garde)
      checkRPS()
      break;
    case GuyState.DrawGarde:
      canFace = false;
      if (animIsFinished(guy)) toState(GuyState.Garde)
      break;
    case GuyState.DrawIdle:
      canFace = false;
      if (animIsFinished(guy)) toState(GuyState.Idle)
      break;
    case GuyState.Knockback:
      guy.anim = sin(guy.timer * 70) > 0 ? guyAnimRed : guyAnim;
      canFace = false;
      fall();
      if (land()) { toState(GuyState.Idle) }
      break;
    case GuyState.Celebrate:
      guy.dx = 0;
      guy.dy = 0;
      let t = 1 - pow(0.01, ds);
      guy.x += (guyCelebratePosition[0] - guy.x) * t;
      guy.y += (guyCelebratePosition[1] - guy.y) * t;
      break;
  }

  guy.damage = [];

  guy.dx *= pow(0.01, ds);
  guy.x = moveHorizontalAgainstTilemap(guy.x, guy.y, guy.w, guy.dx * ds);

  if (canFace) {
    guy.facing = guy.dx >= 0 ? 1 : -1;
  }

  if (guy.y <= DeathFloor + 1) {
    sceneDeath();
  }

  enemies.forEach(e => {
    if (e.actv && intersectCapsules(guy, e)) {
      if (e.danger) {
        guyTakeDamage(e);
      } else if (e.blocker) {
        guy.x = e.x - (guy.w+e.w) * guy.facing;
      }
    }
  })

  guy.gardeCheck.x = guy.x;
  guy.gardeCheck.y = guy.y;

  animInstanceTick(guy.anim, guy.inst);

  cameraSetTarget(
    guy.x + guy.dx / 4,
    guy.lastFloor + (guy.y - guy.lastFloor) / 4 + 10
  );

  //cameraSetTarget(0, 0);
}

function guyDraw(guy: Guy) {
  applyCameraPos(guy.x, guy.y);
  if (guy.facing < 0) {
    flipHorizontal();
  }
  drawAnim(guy.anim, guy.inst.frm, -16, -24);
}

function guyCelebrate(x: number, y: number) {
  if (guy.stat !== GuyState.Celebrate) {
    guyRequestedState = GuyState.Celebrate;
    guyCelebratePosition = [x, y];
  }
}

function guyTakeDamage(e: Enemy) {
  guy.damage.push(e);
}

function guyParrySuccess(e: Enemy) {
  reportEvent(EventTypes.Parry);
  guy.parryTime = clck;
  guy.dx = 60;
}

function guyHitLanded() {
  if (!guy.wasParried) {
    guy.dx *= 0.5;
  }
}

function guyHitParried() {
  guy.wasParried = true;
}

function spawnGuy(x: number, y: number) {
  guy.stat = GuyState.Limbo;
  guyRequestedState = GuyState.Idle;
  spawnGuyLoc = [x, y];
}

