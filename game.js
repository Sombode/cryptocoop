const quoteSpan = document.getElementById("quoteSpan");
const freqTable = document.getElementById("freqTable");
const endScreen = document.getElementById("endScreen");
const stopwatch = document.getElementById("stopwatch");
const solvedTime = document.getElementById("solvedTime");

let startTime = new Date().getTime();
let activeCode = false;
let replacements, replacementsSolution;
let inputs, freqInputs;
let quotes;
let quoteIndex = 0;
let letterJumping = false;
let letterFoci = arraySubscription([], (prop) => {
    handleFocus(prop);
});

const generateQuoteList = () => new Promise((res) => {
    fetch("./quotes/toebes.json")
        .then((r) => r.json())
        .then(shuffleArray)
        .then(($quotes) => { quotes = $quotes; })
        .then(res);
});

function formatMillis(time) {
    const minutes = Math.floor(time / 60000);
    const seconds = Math.round((time / 1000) % 60);
    const millis = time % 1000;
    return `${(minutes < 10 ? "0" : "")}${minutes}:${(seconds < 10 ? "0" : "")}${seconds}.${(millis < 100 ? "0" : "")}${(millis < 10 ? "0" : "")}${millis}`;
}

function updateTime() {
    if(!activeCode) return;
    const time = new Date().getTime() - startTime;
    stopwatch.innerHTML = formatMillis(time);
    window.requestAnimationFrame(updateTime);
}

function createLetter(ciphertext) {
    const letterWrapper = document.createElement("span");
    letterWrapper.classList.add("letter", ciphertext);
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
        plainLetter.onfocus = (event) => {
            letterFoci[numID] = event.target;
        };
        plainLetter.onblur = () => {
            letterFoci[numID] = null;
        };
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
    replacements = new Array(26);
    quote.split(" ").forEach((word) => quoteSpan.appendChild(createWord(word)));
    inputs = Array.from(document.querySelectorAll(".plaintext"));
    generateFreqTable(quote);
    endScreen.style.animation = "none";
    activeCode = true;
    startTime = new Date().getTime();
    requestAnimationFrame(updateTime);
}

function replaceLetter(letter, replacement) {
    const index = ALPHABET.indexOf(letter);
    // Ensure replacement isn't redundant and no letter decodes to itself
    if (replacements[index] === replacement || replacement === ALPHABET[index].toLowerCase()) return (replacement === null ? 0 : -1);
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
        const solveTime = new Date().getTime() - startTime;
        endCode(solveTime);
        emit({
            type: Messages.COMPLETION,
            time: solveTime
        });
    }
    // This function returns a number to change focusOffset by (so that self-decodes don't shift focus)
    return 0;
}

function handleInput(event) {
    // TODO: add cool shortcuts like ctrl-z
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
            skipFilled = event.ctrlKey;
            break;
        case "arrowleft":
            focusOffset = -1;
            skipFilled = event.ctrlKey;
            break;
        case "enter":
            letterJumping = true;
            freqTable.classList.add(`selected${numID}`);
            break;
        default:
            if(event.ctrlKey || !key.match(/^[a-z]{1}$/)) return;
            if(letterJumping) {
                const targetLetter = document.querySelector(`.freqLetter.${key.toUpperCase()} .freqInput`);
                if(targetLetter) targetLetter.focus();
                freqTable.classList.remove(`selected${numID}`);
                letterJumping = false;
                return;
            }
            replacement = key;
            focusOffset = 1;
            skipFilled = true;
            break;
    }
    event.preventDefault();
    // See the comment at the end of replaceLetter for why the += exists here
    if(replacement !== undefined) focusOffset += replaceLetter(event.currentTarget.parentElement.classList[1], replacement);
    const nextInput = getRelativeInput(event.currentTarget, focusOffset, skipFilled); 
    if(nextInput) nextInput.focus();
}

function handleFocus(playerNum) {
    const input = letterFoci[playerNum];
    const cursor = document.getElementById(`cursor${playerNum}`);
    Array.from(document.querySelectorAll(`.selected${playerNum}`)).forEach((letter) => letter.classList.remove(`selected${playerNum}`));
    Array.from(document.querySelectorAll(`.focused${playerNum}`)).forEach((letter) => letter.classList.remove(`focused${playerNum}`));
    if(playerNum == numID) emit({
        type: Messages.CHANGED_FOCUS,
        index: inputs.indexOf(input)
    });
    if(!input) {
        cursor.style.visibility = "hidden";
        return;
    }
    const focusedLetter = input.parentElement.classList[1];
    input.parentElement.classList.add(`focused${playerNum}`);
    Array.from(document.getElementsByClassName(focusedLetter)).forEach((letter) => letter.classList.add(`selected${playerNum}`));
    const boundingRect = input.parentElement.getBoundingClientRect();
    cursor.style.top = `${boundingRect.top}px`;
    cursor.style.left = `${boundingRect.left}px`;
    cursor.style.visibility = "visible";
}

function handleResize() {
    for(playerNum in letterFoci) {
        const input = letterFoci[playerNum];
        const cursor = document.getElementById(`cursor${playerNum}`);
        if(!input) continue;
        const boundingRect = input.parentElement.getBoundingClientRect();
        cursor.style.top = `${boundingRect.top}px`;
        cursor.style.left = `${boundingRect.left}px`;
    }
}

function getRelativeInput(origin, offset, skipFilled) {
    const inputArray = (origin.classList.contains("freqInput") ? freqInputs : inputs);
    if (!inputArray) return origin;
    const originIndex = inputArray.indexOf(origin);
    let newIndex = originIndex + offset;
    if (skipFilled) {
        if(!inputArray[newIndex]) return origin;
        if (offset < 0)
            while (inputArray[newIndex].value != "") {
                newIndex--;
                if(!inputArray[newIndex]) return origin;
            }
        else
            while (inputArray[newIndex].value != "") {
                newIndex++;
                if(!inputArray[newIndex]) return origin;
            }
    }
    newIndex = clamp(newIndex, 0, inputArray.length - 1);
    return inputArray[newIndex];
}

function endCode(time) {
    activeCode = false;
    const formattedTime = formatMillis(time);
    solvedTime.innerHTML = `Solved in ${formattedTime}`;
    stopwatch.innerHTML = formattedTime;
    Array.from(document.querySelectorAll(".plaintext")).forEach((input) => { input.disabled = true; });
    endScreen.style.animation = "none";
    endScreen.style.animation = "0.75s cubic-bezier(0.25, 1, 0.5, 1) 1 forwards slideIn";
}

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
        activeCode = true;
        emit({
            type: Messages.NEW_QUOTE,
            quote: quoteText
        });
    }
}

function generateFreqTable(quoteText) {
    const tableBody = document.querySelector("#freqTable tbody");
    tableBody.innerHTML = "";
    freqInputs = [];
    for(letter of ALPHABET) {
        const count = (quoteText ? (quoteText.match(new RegExp(letter, "g")) || []).length : 0);
        const tableRow = document.createElement("tr");
        tableRow.innerHTML = `<td>${letter}</td><td>${count}</td><td><span class="freqLetter ${letter}"></span><span class="freqHighlight ${letter}"></span></td>`;
        if(count == 0) {
            tableRow.classList.add("empty");
        } else {
            const plainLetter = document.createElement("input");
            plainLetter.classList.add("plaintext", "freqInput");
            plainLetter.type = "text";
            plainLetter.maxLength = 1;
            plainLetter.placeholder = "-";
            plainLetter.readOnly = true;
            plainLetter.onkeydown = (event) => handleInput(event);
            plainLetter.onfocus = (event) => {
                letterFoci[numID] = event.target;
            };
            plainLetter.onblur = () => {
                letterFoci[numID] = null;
            };
            freqInputs.push(plainLetter);
            tableRow.children[2].firstChild.appendChild(plainLetter);
        }
        tableBody.appendChild(tableRow);
    }
}

// DEV FUNCTION
function solve() {
    for(i in replacementsSolution) if(replacementsSolution[i]) replaceLetter(ALPHABET[i], replacementsSolution[i]);
}

onresize = handleResize;
if(isHiveBrain) generateQuoteList().then(newQuote);
else generateFreqTable();
// separate if statement since DEBUG
if(isHiveBrain) document.getElementById("playerNumberStatus").innerText = "You are Player 1!";