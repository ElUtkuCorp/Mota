const assert = require("node:assert");
const { describe, it } = require("node:test");

const GithubValetudoUpdateProvider = require("../../../../../lib/updater/lib/update_provider/GithubValetudoUpdateProvider");

const rawReleases = [
    { tag_name: "2026.11.0", published_at: "2026-11-02T10:00:00Z", prerelease: true, draft: false, body: "", url: "u3" },
    { tag_name: "2026.10.2", published_at: "2026-10-30T10:00:00Z", prerelease: false, draft: false, body: "", url: "u2" },
    { tag_name: "2026.10.3", published_at: "2026-10-31T10:00:00Z", prerelease: false, draft: true, body: "", url: "u4" },
    { tag_name: "2026.10.1", published_at: "2026-10-25T10:00:00Z", prerelease: false, draft: false, body: "", url: "u1" },
];

describe("GithubValetudoUpdateProvider (Mota)", () => {
    it("defaults to the Mota repository", () => {
        const provider = new GithubValetudoUpdateProvider();

        assert.strictEqual(provider.repository, "ElUtkuCorp/Mota");
        assert.strictEqual(provider.releasesUrl, "https://api.github.com/repos/ElUtkuCorp/Mota/releases");
    });

    it("uses a valid custom repository and ignores invalid ones", () => {
        assert.strictEqual(new GithubValetudoUpdateProvider({ repository: "someone/My.Fork-1" }).repository, "someone/My.Fork-1");
        assert.strictEqual(new GithubValetudoUpdateProvider({ repository: "../../evil" }).repository, "ElUtkuCorp/Mota");
        assert.strictEqual(new GithubValetudoUpdateProvider({ repository: "noslash" }).repository, "ElUtkuCorp/Mota");
    });

    it("only offers published releases on the stable channel", () => {
        const versions = new GithubValetudoUpdateProvider().parseReleaseOverviewApiResponse(rawReleases).map(r => {
            return r.version;
        });

        assert.deepStrictEqual(versions, ["2026.10.2", "2026.10.1"]);
    });

    it("includes pre-releases (but never drafts) on the testing channel", () => {
        const versions = new GithubValetudoUpdateProvider({ includePrereleases: true }).parseReleaseOverviewApiResponse(rawReleases).map(r => {
            return r.version;
        });

        assert.deepStrictEqual(versions, ["2026.11.0", "2026.10.2", "2026.10.1"]);
    });
});
