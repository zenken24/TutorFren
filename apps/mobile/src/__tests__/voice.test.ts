import { isPrivateCachePath, transcribeAndDelete } from "../lib/voice";

describe("voice file deletion (zero retention on the phone)", () => {
  const uri = "file:///data/user/0/app/cache/Audio/rec-1.m4a";
  it("deletes the file after a successful upload", async () => {
    const remove = jest.fn();
    await expect(transcribeAndDelete(uri, "bn", { upload: async () => ({ transcript: "hello" }), remove })).resolves.toBe("hello");
    expect(remove).toHaveBeenCalledWith(uri);
  });
  it("deletes the file on a network error", async () => {
    const remove = jest.fn();
    await expect(transcribeAndDelete(uri, "bn", { upload: async () => { throw new Error("network"); }, remove })).rejects.toThrow("network");
    expect(remove).toHaveBeenCalledTimes(1);
  });
  it("deletes the file on a server 500", async () => {
    const remove = jest.fn();
    await expect(transcribeAndDelete(uri, "en", { upload: async () => { throw Object.assign(new Error("x"), { status: 500 }); }, remove })).rejects.toBeTruthy();
    expect(remove).toHaveBeenCalledTimes(1);
  });
  it("is idempotent when the file is already gone", async () => {
    await expect(transcribeAndDelete(uri, "bn", { upload: async () => ({ transcript: "ok" }), remove: () => { throw new Error("ENOENT"); } })).resolves.toBe("ok");
  });
  it("recordings live in the private cache, never shared media", () => {
    expect(isPrivateCachePath(uri, "file:///data/user/0/app/cache/")).toBe(true);
    expect(isPrivateCachePath("file:///storage/emulated/0/Recordings/a.m4a", "file:///data/user/0/app/cache/")).toBe(false);
    expect(isPrivateCachePath("file:///storage/emulated/0/Music/a.m4a", "file:///storage/emulated/0")).toBe(false);
  });
});
