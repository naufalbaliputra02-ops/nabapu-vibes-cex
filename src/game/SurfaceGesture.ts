import { Vector2 } from "three";

export class SurfaceGesture {
  private pointers = new Map<number, Vector2>();
  private owner: number | null = null;
  private origin = new Vector2();
  private previous = new Vector2();
  private dragged = false;

  down(id: number, x: number, y: number) {
    this.pointers.set(id, new Vector2(x, y));
    if (this.pointers.size === 1) {
      this.owner = id;
      this.origin.set(x, y);
      this.previous.copy(this.origin);
      this.dragged = false;
    } else this.dragged = true;
  }

  move(id: number, x: number, y: number) {
    const point = this.pointers.get(id);
    if (!point) return null;
    point.set(x, y);
    if (this.owner !== id) return null;
    const delta = point.clone().sub(this.previous);
    this.previous.copy(point);
    if (this.pointers.size > 1) return null;
    if (point.distanceTo(this.origin) > 7) this.dragged = true;
    return this.dragged ? delta : null;
  }

  end(id: number, canceled = false) {
    if (!this.pointers.has(id)) return false;
    const tap =
      !canceled &&
      !this.dragged &&
      this.pointers.size === 1 &&
      this.owner === id;
    this.pointers.delete(id);
    if (!this.pointers.size) this.reset();
    else {
      // Rebase on the remaining finger instead of applying its old delta.
      if (this.owner === id) this.owner = this.pointers.keys().next().value!;
      this.previous.copy(this.pointers.get(this.owner!)!);
      this.origin.copy(this.previous);
      this.dragged = true;
    }
    return tap;
  }

  reset() {
    this.pointers.clear();
    this.owner = null;
    this.dragged = false;
  }
}
