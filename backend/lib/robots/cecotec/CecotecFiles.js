const fs = require("fs");
const Logger = require("../../Logger");

/**
 * Mota: escritura y lectura de los archivos propios en la flash. Un corte de luz a mitad de un writeFileSync deja el
 * archivo truncado; con un temporal y un rename queda el anterior o el nuevo, nunca uno a medias.
 */
class CecotecFiles {
    /**
     * @param {string} file
     * @param {string|Buffer} data
     */
    static WRITE_ATOMIC(file, data) {
        const tmp = `${file}.tmp`;

        try {
            fs.writeFileSync(tmp, data, {flush: true});
            fs.renameSync(tmp, file);
        } catch (e) {
            fs.rmSync(tmp, {force: true});

            throw e;
        }
    }

    /**
     * Lee un JSON. Si no existe devuelve undefined; si está dañado lo aparta como .corrupt (para no perderlo ni
     * sobrescribirlo) y también devuelve undefined.
     *
     * @param {string} file
     * @param {(value: any) => boolean} [isValid] comprueba la forma
     * @returns {any}
     */
    static READ_JSON(file, isValid) {
        let text;

        try {
            text = fs.readFileSync(file).toString();
        } catch (e) {
            return undefined;
        }

        try {
            const value = JSON.parse(text);

            if (isValid && !isValid(value)) {
                throw new Error("unexpected structure");
            }

            return value;
        } catch (e) {
            Logger.error(`Unable to read ${file}, keeping it as ${file}.corrupt`, e);
            try {
                fs.renameSync(file, `${file}.corrupt`);
            } catch (err) {
                Logger.warn(`Unable to move ${file} aside`, err);
            }

            return undefined;
        }
    }
}

module.exports = CecotecFiles;
