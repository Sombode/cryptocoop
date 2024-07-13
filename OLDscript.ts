import { Peer } from "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";

const quoteSpan = document.getElementById("quoteSpan");
const alphabet = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
let replacements : string[] = new Array(26);
let solutionReplacements : string[];
let inputs : HTMLInputElement[]; // update this after every quote change
let wordAnchors : HTMLInputElement[]; // used for word navigation
const cursor = document.getElementById("cursor1");
type Quote = { author: string, quote: string }
let quotes : Quote[];
let quoteIndex = 0;

function createLetter(ciphertext) {
    const letterWrapper = document.createElement("span");
    const cipherLetter = document.createElement("span");
    //const plainLetter = document.createElement("span");
    letterWrapper.classList.add("letter");
    cipherLetter.classList.add("ciphertext");
    letterWrapper.classList.add(ciphertext);
    cipherLetter.appendChild(document.createTextNode(ciphertext));
    //plainLetter.appendChild(document.createTextNode("-"));
    letterWrapper.appendChild(cipherLetter);
    if(ciphertext.match(/^[A-Z]{1}$/)) {
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
    for(let i = 0; i < ciphertext.length; i++) {
        wordWrapper.appendChild(createLetter(ciphertext.charAt(i)));
    }
    return wordWrapper;
}

function insertSentence(ciphertext) {
    // dev function, shouldn't acutally be used
    ciphertext.split(" ").forEach((word) => quoteSpan?.appendChild(createWord(word)));
}

function replaceLetter(letter, replacement) {
    const index = alphabet.indexOf(letter);
    // ensure replacement isn't redundant and no letter decodes to itself
    // TODO: trying to self-decode moves focus (have it not, please and thank you)
    if(replacements[index] === replacement || replacement?.toUpperCase() === alphabet[index]) return;
    const existingIndex = replacements.indexOf(replacement);
    if(existingIndex != -1) {
        // if the letter has already been used in the plaintext, replace them with empty slots
        document.querySelectorAll(`.${alphabet[existingIndex]} > input`).forEach((input) => {
            (input as HTMLInputElement).value = null;
        });
        replacements[existingIndex] = null;    
    }
    replacements[index] = replacement;
    document.querySelectorAll(`.${letter} > input`).forEach((input) => {
        (input as HTMLInputElement).value = replacement;
    });
    if(document.querySelectorAll(".plaintext:placeholder-shown").length === 0) {
        const testReplacements = replacements.map((letter) => letter.toUpperCase());
        for(let i = 0; i < testReplacements.length; i++) {
            if(testReplacements[i] != solutionReplacements[i] && solutionReplacements[i]) {
                return;
            }
        }
        console.log("solved!");
        newQuote();
    }
}

function handleInput(event : KeyboardEvent) {
    const key = event.key.toLowerCase();
    if(key === "tab" || !event.currentTarget) return;
    // FIXME: this code eats inputs like ctrl-r
        // crap.
    // event.preventDefault();
    // TODO: refactor this spaghetti
    if(key.match(/^[a-z]{1}$/)) {
        if(event.ctrlKey) return;
        event.preventDefault();
        const cipherLetter = (event.currentTarget as HTMLInputElement)?.parentElement?.classList[1];
        replaceLetter(cipherLetter, key);
        getRelativeInput(event.currentTarget as HTMLInputElement, 1, true).focus();
    } else {
        switch(key) {
            case "backspace":
                // FIXME: you really need to get this together
                event.preventDefault();
                const cipherLetter = (event.currentTarget as HTMLInputElement)?.parentElement?.classList[1];
                replaceLetter(cipherLetter, null);
                getRelativeInput(event.currentTarget as HTMLInputElement, -1, false).focus();
                break;
            case " ":
                event.preventDefault();
            case "arrowright":
                if(event.ctrlKey) {
                    if(event.shiftKey) {
                        //FIXME: sometimes holding shift highlights text :(
                        getRelativeWordAnchor(event.currentTarget as HTMLInputElement, 1).focus();
                    } else {
                        getRelativeInput(event.currentTarget as HTMLInputElement, 1, true).focus();    
                    }
                } else {
                    getRelativeInput(event.currentTarget as HTMLInputElement, 1, false).focus();
                }
                break;
            case "arrowleft":
                if(event.ctrlKey) {
                    if(event.shiftKey) {
                        getRelativeWordAnchor(event.currentTarget as HTMLInputElement, -1).focus();
                    } else {
                        getRelativeInput(event.currentTarget as HTMLInputElement, -1, true).focus();    
                    }
                } else {
                    getRelativeInput(event.currentTarget as HTMLInputElement, -1, false).focus();
                }
                break;
            case "arrowup":
                getRelativeWordAnchor(event.currentTarget as HTMLInputElement, 1).focus();
                break;
            case "arrowdown":
                getRelativeWordAnchor(event.currentTarget as HTMLInputElement, -1).focus();
                break;
            default:
                // FIXME: this is horrible horrible horrible horrible
                event.preventDefault();
                break;
        }
    }
}

function handleFocus(event : FocusEvent) {
    // NOTE: scrolling ruins this behavior (ensure no scrolling?)
    const boundingRect = (event.target as HTMLElement).parentElement.getBoundingClientRect();
    cursor.style.top = `${boundingRect.top}px`;
    cursor.style.left = `${boundingRect.left}px`;
    cursor.style.visibility = "visible";
    Array.from(document.getElementsByClassName((event.target as HTMLElement).parentElement.classList[1])).forEach((letter) => {
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
    if(document.activeElement.classList.contains("plaintext")) {
        const boundingRect = document.activeElement.parentElement.getBoundingClientRect();
        cursor.style.top = `${boundingRect.top}px`;
        cursor.style.left = `${boundingRect.left}px`;
    }
}

function getRelativeInput(origin : HTMLInputElement, offset : number, skipFilled : boolean) {
    if(!inputs) return origin;
    const originIndex = inputs.indexOf(origin);
    let newIndex = originIndex + offset;
    if(skipFilled) {
        if(offset < 0) {
            while(inputs[newIndex] && inputs[newIndex].value != "") {
                newIndex--;
            }
        } else {
            while(inputs[newIndex] && inputs[newIndex].value != "") {
                newIndex++;
            }
        }
    }
    newIndex = Math.min(Math.max(newIndex, 0), inputs.length - 1);
    return inputs[newIndex];
}

function getRelativeWordAnchor(origin: HTMLInputElement, offset : number) {
    if(!wordAnchors) {
        // Word anchors are the first and last letter of every word
        wordAnchors = Array.from(document.querySelectorAll(".word .letter:first-child .plaintext, .word .letter:last-child .plaintext"));
    }
    let originIndex = wordAnchors.indexOf(origin);
    if(originIndex === -1) {
        // If the user is not already at a word anchor, find the closest one behind the current letter
            // Side note: ay caramba that's a mouthful
        // FIXME: If the word anchor location is occupied by a non-decodeable character, it is skipped :(
        originIndex = wordAnchors.indexOf(origin.parentElement.parentElement.firstChild.lastChild as HTMLInputElement);
        if(offset < 0) offset++; // Since this already snaps to the previous anchor, the offset should be adjusted
    }
    const newIndex = Math.min(Math.max(originIndex + offset, 0), wordAnchors.length - 1);
    return wordAnchors[newIndex];
}

async function generateQuoteList() {
    // TODO: Add json filtering for mistakes
    quotes = await(fetch("./quotes/toebes.json")
        .then((r) => r.json())
        .then(shuffleArray));
    quoteIndex = 0;
}

function newQuote() {
    if(!quotes) {
        console.error("No quotes found. Attempting to generate list.");
        generateQuoteList().then(newQuote);
    } else {
        const quote = quotes[quoteIndex++ % quotes.length];
        // TODO: actually do stuff with quote author
        console.log(quote.quote);
        let quoteText = quote.quote.toUpperCase();
        const encryption = generateRandomEncryption();
        // truly the most spaghetti of all time
        const encryptionKeys = Object.keys(encryption);
        solutionReplacements = [...Array(26).keys()]
            .map((i) => alphabet[encryptionKeys.find(key => encryption[key] === alphabet[i])])
            .map((letter) => (quoteText.includes(letter) ? letter : null));
        quoteText = quoteText.split("").map((a) => {
            const index = alphabet.indexOf(a);
            return (index === -1 ? a : encryption[index]);
        }).join("");
        quoteSpan.innerHTML = "";
        quoteText.split(" ").forEach((word) => quoteSpan?.appendChild(createWord(word)));
        inputs = Array.from(document.querySelectorAll(".plaintext"));
    }
}

// Most of this is taken directly from the code used
// in r2dev2's Cryptoduel, which the original Cryptocoop forked
// Hence why the code is actually good here
const shuffleArray = (arr: any[]) =>
    arr
      .map((a) => ([Math.random(), a]))
      .sort((a, b) => a[0] - b[0])
      .map((a) => a[1]);
  
const generateRandomEncryption = () => {
    const encMap = shuffleArray([...Array(26).keys()]);
    if (encMap.some((x, i) => x === i)) return generateRandomEncryption();
    return encMap.map((i) => alphabet[i]);
};

onresize = handleResize;
generateQuoteList().then(newQuote);

var peer = new Peer();