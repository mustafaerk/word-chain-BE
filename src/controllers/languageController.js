const ar = require("../../languagues/arabia.json");
const ch = require("../../languagues/china.json");
const id = require("../../languagues/endo.json");
const fil = require("../../languagues/filipino.json");
const fr = require("../../languagues/fr.json");
const de = require("../../languagues/germany.json");
const hi = require("../../languagues/hindu.json");
const sv = require("../../languagues/isvec.json");
const it = require("../../languagues/italy.json");
const ja = require("../../languagues/japan.json");
const ko = require("../../languagues/korea.json");
const pl = require("../../languagues/lehce.json");
const ms = require("../../languagues/malez.json");
const pt = require("../../languagues/portugal.json");
const ro = require("../../languagues/romen.json");
const ru = require("../../languagues/rus.json");
const es = require("../../languagues/spanish.json");
const sr = require("../../languagues/srbia.json");
const th = require("../../languagues/tay.json");
const tr = require("../../languagues/tr.json");


const languageList = {
    "ar": ar,
    "ch": ch,
    "id": id,
    "fil": fil,
    "fr": fr,
    "de": de,
    "hi": hi,
    "sv": sv,
    "it": it,
    "ja": ja,
    "ko": ko,
    "pl": pl,
    "ms": ms,
    "pt": pt,
    "ro": ro,
    "ru": ru,
    "es": es,
    "sr": sr,
    "th": th,
    "tr": tr,
}

module.exports.translate_get = async (req, res) => {
    console.log(req.query)
    const { lang, word } = req.query;
    try {
        res.send({ data: languageList[lang][word] });

    } catch (err) {
        console.log(err)
        res.statusCode = 400;
        res.send({ status: 400, message: err });
    }
};