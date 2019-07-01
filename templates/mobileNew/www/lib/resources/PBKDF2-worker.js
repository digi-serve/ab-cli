import CryptoJS from "crypto-js";

onmessage = function(e) {
    var password = e.data[0];
    var salt = e.data[1];
    var cfg = e.data[2];

    var key = CryptoJS.PBKDF2(password, salt, cfg);
    postMessage(key.toString(CryptoJS.enc.Hex));
    close();
};
