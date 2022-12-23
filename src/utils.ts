export const random = function (min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min);
};

export const randomId = function () {
    return Math.random().toString(36).substr(2, 9);
}

export const removeAllPrivateProperties = function (object: any) {
    for (const key in object) {
        if (object.hasOwnProperty(key)) {
            if (key.startsWith("_")) {
                delete object[key];
            } else if (typeof object[key] === "object") {
                removeAllPrivateProperties(object[key]);
            }
        }
    }

    return object;
}

export const convertSecondToTick = function (second: number, tickrate: number) {
    return Math.floor(second * tickrate);
}


module.exports = {
    random,
    randomId,
    removeAllPrivateProperties,
    convertSecondToTick
};
