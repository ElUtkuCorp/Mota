const ValetudoRelease = require("./ValetudoRelease");
const ValetudoReleaseBinary = require("./ValetudoReleaseBinary");
const ValetudoUpdateProvider = require("./ValetudoUpdateProvider");
const {get} = require("../UpdaterUtils");

class GithubValetudoUpdateProvider extends ValetudoUpdateProvider {
    /**
     * Mota: el repositorio es configurable (por defecto el de Mota) y el canal de pruebas usa las
     * pre-releases de ese mismo repositorio en lugar de las nightlies de Valetudo, que no traen el
     * soporte de la Conga.
     *
     * @param {object} [options]
     * @param {string} [options.repository] "propietario/repositorio" en GitHub
     * @param {boolean} [options.includePrereleases]
     */
    constructor(options) {
        super();

        const repository = options?.repository;

        this.repository = GithubValetudoUpdateProvider.IS_VALID_REPOSITORY(repository) ? repository : GithubValetudoUpdateProvider.DEFAULT_REPOSITORY;
        this.includePrereleases = options?.includePrereleases === true;
    }

    /**
     * @return {string}
     */
    get releasesUrl() {
        return `https://api.github.com/repos/${this.repository}/releases`;
    }

    /**
     * @return {Promise<Array<import("./ValetudoRelease")>>}
     */
    async fetchReleases() {
        const rawReleasesResponse = await get(this.releasesUrl);

        if (!Array.isArray(rawReleasesResponse?.data)) {
            throw new Error("GithubValetudoUpdateProvider: Received invalid releases response");
        }

        return this.parseReleaseOverviewApiResponse(rawReleasesResponse.data);
    }

    /**
     * @param {import("./ValetudoRelease")} release
     * @return {Promise<Array<import("./ValetudoReleaseBinary")>>}
     */
    async fetchBinariesForRelease(release) {
        if (!release.metaData.githubReleaseUrl) {
            throw new Error("Missing Github Release URL in Release Metadata");
        }

        const rawReleaseResponse = await get(release.metaData.githubReleaseUrl);
        let releaseBinaries = [];




        // @ts-ignore
        if (!Array.isArray(rawReleaseResponse?.data?.assets)) {
            throw new Error("GithubValetudoUpdateProvider: Received invalid release response");
        }

        // @ts-ignore
        let manifestAsset = rawReleaseResponse.data.assets.find(a => {
            return a.name === GithubValetudoUpdateProvider.MANIFEST_NAME;
        });

        if (!manifestAsset) {
            throw new Error(`GithubValetudoUpdateProvider: Missing ${GithubValetudoUpdateProvider.MANIFEST_NAME}`);
        }

        const rawManifestResponse = await get(manifestAsset.browser_download_url);

        // @ts-ignore
        if (!rawManifestResponse.data || rawManifestResponse.data.version !== release.version) {
            throw new Error(`GithubValetudoUpdateProvider: Invalid ${GithubValetudoUpdateProvider.MANIFEST_NAME}`);
        }

        const manifest = rawManifestResponse.data;

        // @ts-ignore
        releaseBinaries = rawReleaseResponse.data.assets.filter(a => {
            return a.name !== GithubValetudoUpdateProvider.MANIFEST_NAME;
        }).map(a => {
            return new ValetudoReleaseBinary({
                name: a.name,
                // @ts-ignore
                sha256sum: manifest.sha256sums[a.name] ?? "", //This will cause any install to fail but at least it's somewhat valid
                downloadUrl: a.browser_download_url
            });
        });

        return releaseBinaries;
    }

    /**
     * @param {object} data
     * @return {Array<import("./ValetudoRelease")>}
     */
    parseReleaseOverviewApiResponse(data) {
        const releases = data.filter(rR => {
            return rR.draft === false && (this.includePrereleases || rR.prerelease === false);
        }).map(rR => {
            return new ValetudoRelease({
                version: rR.tag_name,
                releaseTimestamp: new Date(rR.published_at),
                changelog: rR.body,
                metaData: {
                    githubReleaseUrl: rR.url
                }
            });
        });

        releases.sort((a, b) => {
            return b.releaseTimestamp.getTime() - a.releaseTimestamp.getTime();
        });

        return releases;
    }
}


/**
 * @param {any} repository
 * @return {boolean}
 */
GithubValetudoUpdateProvider.IS_VALID_REPOSITORY = function(repository) {
    return typeof repository === "string" && /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/.test(repository);
};

GithubValetudoUpdateProvider.TYPE = "github";
GithubValetudoUpdateProvider.NIGHTLY_TYPE = "github_nightly";

GithubValetudoUpdateProvider.DEFAULT_REPOSITORY = "ElUtkuCorp/Mota";
GithubValetudoUpdateProvider.MANIFEST_NAME = "valetudo_release_manifest.json";


module.exports = GithubValetudoUpdateProvider;
