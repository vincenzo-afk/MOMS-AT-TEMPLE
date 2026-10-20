import { describe, expect, it } from "vitest";
import { musicCueFor } from "./musicCues";

const at = (hour: number, extra: Partial<Parameters<typeof musicCueFor>[0]> = {}) => musicCueFor({ hour, festivalHeld: false, inWorkshop: false, visiting: false, ...extra });

describe("music cues (README §11)", () => {
  it("follows the hours of the day", () => {
    expect(at(6)).toBe("mus_morning");
    expect(at(12)).toBe("mus_exploration_day");
    expect(at(18.5)).toBe("mus_evening");
    expect(at(23)).toBeNull();
    expect(at(3)).toBeNull();
  });
  it("plays the workshop cue in the workshop by day only", () => {
    expect(at(11, { inWorkshop: true })).toBe("mus_workshop");
    expect(at(7, { inWorkshop: true })).toBe("mus_morning");
    expect(at(19, { inWorkshop: true })).toBe("mus_evening");
  });
  it("festival evenings after the lamp festival; silence during a Temple Visit", () => {
    expect(at(19, { festivalHeld: true })).toBe("mus_festival");
    expect(at(12, { festivalHeld: true })).toBe("mus_exploration_day");
    expect(at(12, { visiting: true })).toBeNull();
  });
});
