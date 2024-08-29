function validateHanbatEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@(edu\.hanbat\.ac\.kr|hanbat\.ac\.kr)$/;

    return re.test(String(email).toLowerCase());
}

module.exports = {
    validateHanbatEmail
};
