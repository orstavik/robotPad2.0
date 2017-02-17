class MatrixChange {
  static doStartSnap(point, start) {
    let nearStartingPoint = Math.abs(start.x - point.x) < 6 && Math.abs(start.y - point.y) < 6;
    return nearStartingPoint ? start : point;
  }

  static multiMatrixTom(A, B) {
    A = [
      [A[0], A[2], A[4]],
      [A[1], A[3], A[5]],
      [0, 0, 1]
    ];
    B = [
      [B[0], B[2], B[4]],
      [B[1], B[3], B[5]],
      [0, 0, 1]
    ];
    const arr = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let ai = 0; ai < A.length; ai++) {
      for (let bj = 0; bj < B[0].length; bj++) {
        for (let aj = 0; aj < A[0].length; aj++) {
          for (let bi = 0; bi < B.length; bi++) {
            if (aj === bi) {
              arr[ai][bj] += A[ai][aj] * B[bi][bj];
            }
          }
        }
      }
    }
    return [arr[0][0], arr[1][0], arr[0][1], arr[1][1], arr[0][2], arr[1][2]];
  }
}

class RotateChange {
  constructor(startPoint, center) {
    this.start = startPoint;        //don't really need
    this.center = center;
    this.startAngle = RotateChange.calcAngle(this.center, startPoint);
  }

  static calcAngle(center, satelite) {
    return Math.atan2(satelite.y - center.y, satelite.x - center.x);
  }

  calcNewSatelitePosition(point) {
    let x = point.x - this.center.x;                           //The position of the shape from this.center = {x,y}.
    let y = point.y - this.center.y;
    const radius = Math.sqrt(x * x + y * y);    //the length of the radius from the center of the group to the center of the shape.
    const oldAngle = Math.atan2(y, x);          //the angle between the vertical (horisontal?) line and to the shape, from 0->2PI
    const newAngle = oldAngle + this.getAngle();    //adds the angle change
    const newX = Math.cos(newAngle) * radius;   //calculates the new x and y coordinates to where the shape should move.
    const newY = Math.sin(newAngle) * radius;
    return {x: this.center.x + newX, y: this.center.y + newY};  //returns the new position positioned against the underlying map again.
  }

  update(newPoint, shift) {
    this.newPoint = MatrixChange.doStartSnap(newPoint, this.start);
    this.absAngle = this.getAbsoluteAngle();
    this.angle = this.absAngle - this.startAngle;
  }

  applyToShapeInfoObject(info) {
    return info.rotateAndSetNewPosition(
      this.getAngle(),
      this.calcNewSatelitePosition(info)
    );
  }

  getMatrix() {
//        if (shiftIsDown)
//          return RotateChange.toMatrix(this.angle)?
//        if (ctrlIsDown)
//          return RotateChange.toMatrix(this.angle snap to nearest 30degree?);
    return RotateChange.toMatrix(this.getAngle());
  }

  getCenter(){
    return this.center;
  }
  getAngle() {
    return this.angle || 0;
  }

  getAbsoluteAngle() {
    return RotateChange.calcAngle(this.center, this.newPoint);
  }

  static toMatrix(rad) {
    return [
      Math.cos(rad),
      Math.sin(rad),
      -Math.sin(rad),
      Math.cos(rad),
      0,
      0
    ];
  }

  subdueMatrix(matrix) {
    return MatrixChange.multiMatrixTom(this.getMatrix(), matrix);
  }
}

class MoveChange {
  constructor(startPoint) {
    this.start = startPoint;
  }

  update(newPoint, shift) {
    this.newPoint = MatrixChange.doStartSnap(newPoint, this.start);
    this.xMove = this.newPoint.x - this.start.x;
    this.yMove = this.newPoint.y - this.start.y;
  }

  applyToShapeInfoObject(info){
    return info.move(this.getX(), this.getY());
  }

  getX(){
    return this.xMove || 0;
  }

  getY(){
    return this.yMove || 0;
  }

  getMatrix() {
//        if (shift)
//          this.yMove = 0;
//        if (ctrl)
//          this.xMove = 0;
    return [1, 0, 0, 1, this.getX(), this.getY()];
  }

  subdueMatrix(matrix) {
    return MatrixChange.multiMatrixTom(this.getMatrix(), matrix);
  }

  static makeMoveChange(start,end){
    let c = new MoveChange(start);
    c.update(end, false);
    return c;
  }
}

class ScaleChangeBackup {
  constructor(startPoint, boxWidth, boxHeight, direction, box) {
    this.start = startPoint;
    this.boxWidth = boxWidth;
    this.boxHeight = boxHeight;
    this.action = "scale";
    this.direction = direction;
    this.box = box;
    this.percentX = 0;
    this.percentY = 0;
    this.xMove = 0;
    this.yMove = 0;
  }

  update(newPoint, shift) {
    newPoint = MatrixChange.doStartSnap(newPoint, this.start);
    let xMove = newPoint.x - this.start.x;
    let yMove = newPoint.y - this.start.y;

    if (this.direction.indexOf("n") < 0 && this.direction.indexOf("s") < 0)
      yMove = 0;
    if (this.direction.indexOf("e") < 0 && this.direction.indexOf("w") < 0)
      xMove = 0;

    this.percentX = xMove / this.boxWidth;
    this.percentY = yMove / this.boxHeight;
    this.yMove = this.percentY * this.boxHeight / 2;
    this.xMove = this.percentX * this.boxWidth / 2;
    if (this.direction.indexOf("n") >= 0)
      this.percentY *= -1;
    if (this.direction.indexOf("w") >= 0)
      this.percentX *= -1;
  }

  getMatrix() {
    //        if (shift){
    //          this.percentX = 0;
    //          this.xMove = a little less or more?
    //        }
    //        if (ctrl){
    //          this.percentY = 0;
    //          this.yMove = a little less or more?
    //        }
    return [
      1 + this.percentX,
      0,
      0,
      1 + this.percentY,
      this.xMove,
      this.yMove];
  }

  subdueMatrix(matrix) {
    return MatrixChange.multiMatrixTom(matrix, this.getMatrix());
  }
}

class ScaleChange {
  constructor(startPoint, center, direction, box) {
    this.start = startPoint;
    this.center = center;
    let xMove = this.start.x - center.x;
    let yMove = this.start.y - center.y;
    this.boxWidth = Math.abs(xMove)*2;
    this.boxHeight = Math.abs(yMove)*2;
    this.direction = direction;
    this.box = box;
    this.percentX = 0;
    this.percentY = 0;
    this.xMove = 0;
    this.yMove = 0;
  }

  update(newPoint, shift) {
    this.newPoint = MatrixChange.doStartSnap(newPoint, this.start);
    let xMove = newPoint.x - this.start.x;
    let yMove = newPoint.y - this.start.y;

    if (this.direction.indexOf("n") < 0 && this.direction.indexOf("s") < 0)
      yMove = 0;
    if (this.direction.indexOf("e") < 0 && this.direction.indexOf("w") < 0)
      xMove = 0;

    this.percentX = xMove / this.boxWidth;
    this.percentY = yMove / this.boxHeight;
    this.yMove = this.percentY * this.boxHeight / 2;
    this.xMove = this.percentX * this.boxWidth / 2;
    if (this.direction.indexOf("n") >= 0)
      this.percentY *= -1;
    if (this.direction.indexOf("w") >= 0)
      this.percentX *= -1;
  }

  //todo does not work in rotated space start
  applyToShapeInfoObject(info){
    let c = ScaleChange._moveInScaledBox(this.percentX, this.percentY, this.box, this.direction, info);
    return ScaleChange._scaleInRotatedBox(this.percentX, this.percentY, c);
  }

  static rotateAng(x,y,a) {
    let nx = (Math.cos(a)*x)+(Math.sin(a)*y);
    let ny = (Math.cos(a)*y)-(Math.sin(a)*x);
    return [nx,ny];
  }

  static _scaleInRotatedBox(xPercent, yPercent, info) {
    const c = info.clone();
    let newVector = ScaleChange.rotateAng(xPercent, yPercent, c.angle);
    c.h *= (1+newVector[0]);
    c.w *= (1+newVector[1]);
    return c;
  }

  static _moveInScaledBox(xPercent, yPercent, box, direction, info) {
    const c = info.clone();
    if (direction.indexOf("s") >= 0)
      c.y += (c.y - box.top) * yPercent;
    else if (direction.indexOf("n") >= 0)
      c.y -= (box.bottom - c.y) * yPercent;
    if (direction.indexOf("e") >= 0)
      c.x += (c.x - box.left) * xPercent;
    else if (direction.indexOf("w") >= 0)
      c.x -= (box.right - c.x) * xPercent;
    return c;
  }
  //todo does not work in rotated space end

  getMatrix() {
    //        if (shift){
    //          this.percentX = 0;
    //          this.xMove = a little less or more?
    //        }
    //        if (ctrl){
    //          this.percentY = 0;
    //          this.yMove = a little less or more?
    //        }
    return [
      1 + this.percentX,
      0,
      0,
      1 + this.percentY,
      this.xMove,
      this.yMove];
  }

  subdueMatrix(matrix) {
    return MatrixChange.multiMatrixTom(matrix, this.getMatrix());
  }
}