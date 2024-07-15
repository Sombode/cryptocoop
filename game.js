var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

const quoteSpan = document.getElementById("quoteSpan");
const cursor = document.getElementById("cursor1");

let replacements = new Array(26);
let replacementsSolution;
let inputs, wordAnchors;
let quotes;
let quoteIndex = 0;

function createLetter(ciphertext) {
    const letterWrapper = document.createElement("span");
    letterWrapper.classList.add("letter");
    letterWrapper.classList.add(ciphertext);
    const cipherLetter = document.createElement("span");
    cipherLetter.classList.add("ciphertext");
    cipherLetter.appendChild(document.createTextNode(ciphertext));
    letterWrapper.appendChild(cipherLetter);
    if (ciphertext.match(/^[A-Z]{1}$/)) {
        const plainLetter = document.createElement("input");
        plainLetter.classList.add("plaintext");
        plainLetter.type = "text";
        plainLetter.maxLength = 1;
        plainLetter.placeholder = "-";
        plainLetter.readOnly = true;
        plainLetter.onkeydown = (event) => handleInput(event);
        plainLetter.onfocus = (event) => handleFocus(event);
        plainLetter.onblur = handleFocusLoss;
        letterWrapper.appendChild(plainLetter);
    }
    return letterWrapper;
}

function createWord(ciphertext) {
    const wordWrapper = document.createElement("span");
    wordWrapper.classList.add("word");
    for (const letter of ciphertext.split(""))
        wordWrapper.appendChild(createLetter(letter));
    return wordWrapper;
}

function insertQuote(quote) {
    quoteSpan.innerHTML = "";
    quote.split(" ").forEach((word) => quoteSpan.appendChild(createWord(word)));
    inputs = Array.from(document.querySelectorAll(".plaintext"));
}

function replaceLetter(letter, replacement) {
    const index = ALPHABET.indexOf(letter);
    // ensure replacement isn't redundant and no letter decodes to itself
    // TODO: trying to self-decode moves focus (have it not, please and thank you)
    if (replacements[index] === replacement || replacement === ALPHABET[index]) return;
    const existingIndex = replacements.indexOf(replacement);
    if (existingIndex != -1) {
        // if the letter has already been used in the plaintext, replace them with empty slots
        document.querySelectorAll(`.${ALPHABET[existingIndex]} > input`).forEach((input) => { input.value = null; });
        replacements[existingIndex] = null;
    }
    replacements[index] = replacement;
    document.querySelectorAll(`.${letter} > input`).forEach((input) => { input.value = replacement; });
    emit({
        type: Messages.REPLACE_LETTER,
        letter: letter,
        replacement: replacement
    });
    if (isHiveBrain && document.querySelectorAll(".plaintext:placeholder-shown").length === 0) {
        const testReplacements = replacements.map((letter) => letter.toUpperCase());
        for (let i = 0; i < testReplacements.length; i++) {
            if (testReplacements[i] != replacementsSolution[i] && replacementsSolution[i]) return;
        }
        console.log("solved!");
        newQuote();
    }
}

function handleInput(event) {
    var _a, _b, _c, _d;
    const key = event.key.toLowerCase();
    if (key === "tab" || !event.currentTarget)
        return;
    // FIXME: this code eats inputs like ctrl-r
    // crap.
    // event.preventDefault();
    // TODO: refactor this spaghetti
    if (key.match(/^[a-z]{1}$/)) {
        if (event.ctrlKey)
            return;
        event.preventDefault();
        const cipherLetter = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.parentElement) === null || _b === void 0 ? void 0 : _b.classList[1];
        replaceLetter(cipherLetter, key);
        getRelativeInput(event.currentTarget, 1, true).focus();
    }
    else {
        switch (key) {
            case "backspace":
                // FIXME: you really need to get this together
                event.preventDefault();
                const cipherLetter = (_d = (_c = event.currentTarget) === null || _c === void 0 ? void 0 : _c.parentElement) === null || _d === void 0 ? void 0 : _d.classList[1];
                replaceLetter(cipherLetter, null);
                getRelativeInput(event.currentTarget, -1, false).focus();
                break;
            case " ":
                event.preventDefault();
            case "arrowright":
                if (event.ctrlKey) {
                    if (event.shiftKey) {
                        //FIXME: sometimes holding shift highlights text :(
                        getRelativeWordAnchor(event.currentTarget, 1).focus();
                    }
                    else {
                        getRelativeInput(event.currentTarget, 1, true).focus();
                    }
                }
                else {
                    getRelativeInput(event.currentTarget, 1, false).focus();
                }
                break;
            case "arrowleft":
                if (event.ctrlKey) {
                    if (event.shiftKey) {
                        getRelativeWordAnchor(event.currentTarget, -1).focus();
                    }
                    else {
                        getRelativeInput(event.currentTarget, -1, true).focus();
                    }
                }
                else {
                    getRelativeInput(event.currentTarget, -1, false).focus();
                }
                break;
            case "arrowup":
                getRelativeWordAnchor(event.currentTarget, 1).focus();
                break;
            case "arrowdown":
                getRelativeWordAnchor(event.currentTarget, -1).focus();
                break;
            case "escape":
                newQuote();
                break;
            default:
                // FIXME: this is horrible horrible horrible horrible
                event.preventDefault();
                break;
        }
    }
}

function handleFocus(event) {
    // NOTE: scrolling ruins this behavior (ensure no scrolling?)
    const boundingRect = event.target.parentElement.getBoundingClientRect();
    cursor.style.top = `${boundingRect.top}px`;
    cursor.style.left = `${boundingRect.left}px`;
    cursor.style.visibility = "visible";
    Array.from(document.getElementsByClassName(event.target.parentElement.classList[1])).forEach((letter) => {
        letter.classList.add("selected");
    });
}

function handleFocusLoss() {
    // note: this relies on the fact that at least on chrome, blur events run BEFORE focus events
    // if some browser happens to run blur AFTER focus, this will likely be all kinds of messed up
    Array.from(document.getElementsByClassName("selected")).forEach((letter) => {
        letter.classList.remove("selected");
    });
    cursor.style.visibility = "hidden";
}

function handleResize() {
    if (document.activeElement.classList.contains("plaintext")) {
        const boundingRect = document.activeElement.parentElement.getBoundingClientRect();
        cursor.style.top = `${boundingRect.top}px`;
        cursor.style.left = `${boundingRect.left}px`;
    }
}

function getRelativeInput(origin, offset, skipFilled) {
    if (!inputs)
        return origin;
    const originIndex = inputs.indexOf(origin);
    let newIndex = originIndex + offset;
    if (skipFilled) {
        if (offset < 0) {
            while (inputs[newIndex] && inputs[newIndex].value != "") {
                newIndex--;
            }
        }
        else {
            while (inputs[newIndex] && inputs[newIndex].value != "") {
                newIndex++;
            }
        }
    }
    newIndex = Math.min(Math.max(newIndex, 0), inputs.length - 1);
    return inputs[newIndex];
}

function getRelativeWordAnchor(origin, offset) {
    if (!wordAnchors) {
        // Word anchors are the first and last letter of every word
        wordAnchors = Array.from(document.querySelectorAll(".word .letter:first-child .plaintext, .word .letter:last-child .plaintext"));
    }
    let originIndex = wordAnchors.indexOf(origin);
    if (originIndex === -1) {
        // If the user is not already at a word anchor, find the closest one behind the current letter
        // Side note: ay caramba that's a mouthful
        // FIXME: If the word anchor location is occupied by a non-decodeable character, it is skipped :(
        originIndex = wordAnchors.indexOf(origin.parentElement.parentElement.firstChild.lastChild);
        if (offset < 0)
            offset++; // Since this already snaps to the previous anchor, the offset should be adjusted
    }
    const newIndex = Math.min(Math.max(originIndex + offset, 0), wordAnchors.length - 1);
    return wordAnchors[newIndex];
}

const generateQuoteList = () => new Promise((res) => {
    fetch("./quotes/toebes.json")
        .then((r) => r.json())
        .then(shuffleArray)
        .then(($quotes) => { quotes = $quotes; })
        .then(res);
});

function newQuote() {
    if (!quotes) {
        console.error("No quotes found. Attempting to generate list.");
        generateQuoteList().then(newQuote);
    } else {
        // TODO: actually do stuff with quote author
        const quoteObj = quotes[quoteIndex++ % quotes.length];
        let quoteText = quoteObj.quote.toUpperCase();
        console.log(quoteText);
        const encryption = generateRandomEncryption();
        replacementsSolution = new Array(26);
        for(const i in encryption) {
            const letter = ALPHABET[i];
            replacementsSolution[ALPHABET.indexOf(encryption[i])] = (quoteText.includes(letter) ? letter : null);
        }
        quoteText = quoteText.split("").map((letter) => {
            const index = ALPHABET.indexOf(letter);
            return (index === -1 ? letter : encryption[index]);
        }).join("");
        insertQuote(quoteText);
        emit({
            type: Messages.NEW_QUOTE,
            quote: quoteText
        });
    }
}

onresize = handleResize;
if(isHiveBrain) generateQuoteList().then(newQuote);