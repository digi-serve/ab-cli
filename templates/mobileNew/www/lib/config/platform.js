/*
 * Platform
 * Settings that determine how the platform itself operates:
 */

module.exports = {
    /*
     * encryptedStorage  {bool}  [true, false]
     * Do we need to encrypt our data on the device?
     *
     * Note: setting this to true, will enable password protection.
     */
    encryptedStorage: true,

    /*
     * passwordProtection  {bool}  [true, false]
     * Do we need to password protect the application?
     */
    passwordProtected: true
};
