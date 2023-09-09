const enum DialogCondition {
  Timeout,
  Press,
  Hold
}

interface DialogLine {
  who: string;
  says: string;
  condition: DialogCondition;
}

interface DialogScript {
  lines: DialogLine[]
}

function makeDialog(input: string) {
  let lines: DialogLine[] = input.split('\n').map(line => {
    let parts = line.split('|');
    return { who: parts[0], says: parts[1], condition: parseInt(parts[2]) || DialogCondition.Timeout };
  })
  dialog = { lines }
  dialogLine = -1;
  dialogNext();
}

function dialogClear() {
  dialog = 0;
  showingInstruction = -1;
}

let dialog: DialogScript | 0 = 0;
let dialogLine = 0;
let dialogTime = 0;
let dialogWait = 2;
let dialogShowingAll = false;

const dialogNext = () => {
  dialogLine++;
  dialogTime = 0;
  dialogWait = 2;
  dialogShowingAll = false;
}

function dialogIsComplete() { 
  return dialog === 0 || dialogLine >= dialog.lines.length;
}

function dialogTick() {
  if (dialog === 0) return false;

  let dline = dialog.lines[dialogLine];
  if (!dline) return false;

  dialogTime += ds;
  if (dialogShowingAll) {
    dialogWait -= ds;
  }

  if (dline.condition === DialogCondition.Press) {
    if (justPressed[Keys.Dialog]) {
      return dialogNext();
    }
  } 
  if (dline.condition === DialogCondition.Timeout) {
    if (dialogWait < 0) {
      return dialogNext();
    }
  }

  let maxLetters = 30;
  let textX = 3;
  if (dline.who) {
    ctx.resetTransform();
    ctx.fillStyle = cssPalette[0];
    ctx.globalAlpha = 0.5;
    ctx.fillRect(0, 80-27, 22, 28);
    ctx.globalAlpha = 1;
    drawAnim(portraitAnim, dialogShowingAll ? 0 : round(dialogTime * 8) % 2, 1, 80 - 26);
    maxLetters = 20;
    textX = 22;
  }

  let words = dline.says.split(' ');
  let line: string = '';
  let lines: string[] = [];
  while (words.length) {
    if (line.length + words[0].length > maxLetters) {
      lines.push(line);
      line = '';
    }
    line += ' ' + words.shift();
  }
  lines.push(line);
  
  let y = 80 - lines.length * 8 + 1;
  let remaining = dialogTime * 20;

  lines.map(l => {
    let showing = min(remaining, l.length);
    ctx.globalAlpha = 0.5;
    ctx.fillRect(textX, y - 1, 100, 8);
    ctx.globalAlpha = 1;
    printText(textX, y, l.substring(0, showing));
    remaining -= showing;
    y += 8;
  })
  dialogShowingAll = remaining > 0;

  return true;
}

