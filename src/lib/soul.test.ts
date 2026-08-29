// node --experimental-strip-types src/lib/soul.test.ts
import assert from "node:assert/strict";
import { REGIONS, SHAPES, rankFor, shapePath } from "./soul.ts";

// morphing only works if every shape's path has the identical command structure
const shape = SHAPES.map((s) => s.d.replace(/[\d.\s]+/g, ""));
assert.equal(new Set(shape).size, 1, "shape paths must share one command structure");
assert.ok(SHAPES.every((s) => /^M[\d.\s]/.test(s.d)), "every path starts with a moveto");

// the crescent must actually be concave: some point sits left of the unit circle's centre
const xs = [...shapePath("crescent").matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map((m) => +m[1]);
assert.ok(Math.min(...xs) < 20, "crescent should cut deep past centre-left");

assert.equal(rankFor(0), "New Soul");
assert.equal(rankFor(3), "Wanderer");
assert.equal(rankFor(6), "Guardian");
assert.equal(rankFor(99), "Guardian");

assert.equal(new Set(REGIONS.map((r) => r.id)).size, REGIONS.length, "region ids are unique");
assert.equal(REGIONS.filter((r) => r.hidden).length, 1, "exactly one hidden region");

console.log("soul.ts ok");
