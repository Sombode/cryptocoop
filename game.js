const quoteSpan = document.getElementById("quoteSpan");
const cursor = document.getElementById("cursor1");

let replacements, replacementsSolution;
let inputs;
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
    // Ensure replacement isn't redundant and no letter decodes to itself
    if (replacements[index] === replacement || replacement === ALPHABET[index].toLowerCase()) return -1;
    const existingIndex = replacements.indexOf(replacement);
    if (existingIndex != -1) {
        // If the letter has already been used in the plaintext, replace them with empty slots
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
        if(testReplacements.some((_, i) => (testReplacements[i] != replacementsSolution[i] && replacementsSolution[i]))) return 0;
        console.log("solved!");
        newQuote();
    }
    // This function returns a number to change focusOffset by (so that self-decodes don't shift focus)
    return 0;
}

function handleInput(event) {
    const key = event.key.toLowerCase();
    let replacement, focusOffset, skipFilled;
    switch(key) {
        case "backspace":
            replacement = null;
            focusOffset = -1;
            break;
        case " ":
            replacement = null;
            focusOffset = 1;
            break;
        case "arrowright":
            focusOffset = 1;
            skipFilled = event.shiftKey;
            break;
        case "arrowleft":
            focusOffset = -1;
            skipFilled = event.shiftKey;
            break;
        default:
            if(event.ctrlKey || !key.match(/^[a-z]{1}$/)) return;
            replacement = key;
            focusOffset = 1;
            skipFilled = true;
            break;
    }
    event.preventDefault();
    // See the comment at the end of replaceLetter for why the += exists here
    if(replacement !== undefined) focusOffset += replaceLetter(event.currentTarget.parentElement.classList[1], replacement);
    getRelativeInput(event.currentTarget, focusOffset, skipFilled).focus();
}

function handleFocus(event) {
    // NOTE: scrolling ruins this behavior (ensure no scrolling?)
    const boundingRect = event.target.parentElement.getBoundingClientRect();
    cursor.style.top = `${boundingRect.top}px`;
    cursor.style.left = `${boundingRect.left}px`;
    cursor.style.visibility = "visible";
    Array.from(document.getElementsByClassName(event.target.parentElement.classList[1])).forEach((letter) => letter.classList.add("selected"));
}

function handleFocusLoss() {
    // note: this relies on the fact that at least on chrome, blur events run BEFORE focus events
    // if some browser happens to run blur AFTER focus, this will likely be all kinds of messed up
    Array.from(document.getElementsByClassName("selected")).forEach((letter) => letter.classList.remove("selected"));
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
    if (!inputs) return origin;
    const originIndex = inputs.indexOf(origin);
    let newIndex = originIndex + offset;
    if (skipFilled) {
        if(!inputs[newIndex]) return origin;
        if (offset < 0)
            while (inputs[newIndex].value != "") {
                newIndex--;
                if(!inputs[newIndex]) return origin;
            }
        else
            while (inputs[newIndex].value != "") {
                newIndex++;
                if(!inputs[newIndex]) return origin;
            }
    }
    newIndex = clamp(newIndex, 0, inputs.length - 1);
    return inputs[newIndex];
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
        replacements = new Array(26);
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