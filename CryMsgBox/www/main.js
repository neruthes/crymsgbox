const hiBase32 = base32;

function encode_msg(realpub, ephepub, nonce, ciphertext) {
    // Concatenate the real public key, ephemeral public key, and the ciphertext
    var combined = new Uint8Array(realpub.length + ephepub.length + nonce.length + ciphertext.length);
    console.log(`realpub`)
    console.log(realpub)
    console.log(`ephepub`)
    console.log(ephepub)
    console.log(`nonce`)
    console.log(nonce)

    let current_seek = 0;

    combined.set(realpub, current_seek); current_seek += realpub.length;
    combined.set(ephepub, current_seek); current_seek += ephepub.length;
    combined.set(nonce, current_seek); current_seek += nonce.length;
    combined.set(ciphertext, current_seek);
    console.log(`combined`)
    console.log(combined)
    return combined;
}

function decode_msg(bytestream) {
    // Extract the public key and the ciphertext from the bytestream
    let current_seek = 0;
    var realpub = new Uint8Array(bytestream.slice(current_seek, current_seek += 3));
    var ephepub = new Uint8Array(bytestream.slice(current_seek, current_seek += 32));
    var nonce = new Uint8Array(bytestream.slice(current_seek, current_seek += 24));
    var ciphertext = new Uint8Array(bytestream.slice(current_seek));
    return { realpub, ephepub, nonce, ciphertext };
}

function copyToClipboard(text) {
    // Check if Cordova is available (we are in a Cordova environment)
    if (window.clipboard) {
        alert(`We can find 'window.clipboard'. Looks like cordova.`);
    }
    if (window.cordova) {
        cordova.plugins.clipboard.copy(
            text,
            function () {
                console.log('Copy to clipboard succeeded');
            },
            function () {
                console.error('Copy to clipboard failed');
                alert('Copy to clipboard failed (cordova)');
            }
        );
    } else if (navigator.clipboard) {
        // We are in a modern browser with Clipboard API support
        navigator.clipboard.writeText(text)
            .then(() => {
                console.log('Copy to clipboard succeeded');
            })
            .catch(err => {
                console.error('Copy to clipboard failed', err);
                alert('Copy to clipboard failed (browser)', err);
            });
    } else {
        console.error('Copy to clipboard not supported in this browser');
        alert('Copy to clipboard not supported in this browser');
    }
}



function uint8array_to_uint12array(uint8Array) {
    let uint4Array = [];
    for (let i = 0; i < uint8Array.length; i++) {
        uint4Array.push(uint8Array[i] >> 4);
        uint4Array.push(uint8Array[i] & 15);
    }

    let padding = (3 - (uint4Array.length % 3)) % 3;

    let uint12Array = [];
    for (let i = 0; i < uint4Array.length + padding; i += 3) {
        uint12Array.push((uint4Array[i] << 8) | (uint4Array[i + 1] << 4) | (uint4Array[i + 2]));
    }

    return { uint12Array, padding };
}

function uint12array_to_uint8array(uint12Array, padding) {
    let uint4Array = [];
    for (let i = 0; i < uint12Array.length; i++) {
        uint4Array.push((uint12Array[i] >> 8) & 15);
        uint4Array.push((uint12Array[i] >> 4) & 15);
        uint4Array.push(uint12Array[i] & 15);
    }

    uint4Array = uint4Array.slice(0, uint4Array.length - padding);

    let uint8Array = [];
    for (let i = 0; i < uint4Array.length; i += 2) {
        uint8Array.push((uint4Array[i] << 4) | uint4Array[i + 1]);
    }

    return uint8Array;
}



function toBase4096(uint8arr) {
    let { uint12Array: arr2, padding } = uint8array_to_uint12array(uint8arr);
    let output = arr2.map(x => String.fromCodePoint(x + 0xAC00)).join('') + (new Array(padding)).fill('밄').join('');
    return output; // encoded string
}
function fromBase4096(str) {
    function countCharInString(string, char) {
        return string.split(char).length - 1;
    }
    padding = countCharInString(str, '밄');
    let arr2 = str.replace(/밄/g, '').split('').map(x => x.codePointAt(0) - 0xAC00);
    let arr3 = uint12array_to_uint8array(arr2, padding);
    return arr3; // uint8array
}





document.addEventListener('DOMContentLoaded', function () {
    let tabButtons = document.querySelectorAll('.tab-button');
    let tabContents = document.querySelectorAll('.tab-content');

    let recipientInput = document.getElementById('recipient');
    let messageInput = document.getElementById('message');
    let decryptButton = document.getElementById('decrypt');
    let encryptButton = document.getElementById('encrypt');
    let copyButton = document.getElementById('copy');
    let copyButtonForDecrypted = document.getElementById('copy-decrypted');

    window.mailboxes = JSON.parse(localStorage.getItem('mailboxes')) || [];
    let currentCiphertext = null;

    // If there are no mailboxes, create one
    if (mailboxes.length === 0) {
        let keypair = nacl.box.keyPair();
        mailboxes.push(keypair);
        localStorage.setItem('mailboxes', JSON.stringify(mailboxes));
    }


    // Display mailboxes
    let meTabContent = document.getElementById('tab3mailboxes');
    mailboxes.forEach(function (mailbox, index) {
        // Create a SHA-256 hash of the public key
        var shaObj = new jsSHA('SHA-256', 'BYTES');
        shaObj.update(mailbox.publicKey);
        var hash = shaObj.getHash('HEX').substring(0, 8);

        // Convert the public key to base32
        var publicKeyArray = Object.values(mailbox.publicKey);
        var publicKeyUint8Array = new Uint8Array(publicKeyArray);
        var pubkeyBase32 = hiBase32.encode(publicKeyUint8Array);

        console.log(`mailbox.publicKey`)
        console.log(mailbox.publicKey)
        console.log(`pubkeyBase32`)
        console.log(pubkeyBase32)

        var card = document.createElement('div');
        card.className = 'card';

        var title = document.createElement('div');
        title.className = 'card-title';
        title.textContent = `Keypair ${hash.toUpperCase()}`;
        card.appendChild(title);

        var separator = document.createElement('hr');
        separator.className = 'card-separator';
        card.appendChild(separator);

        var pubkey = document.createElement('div');
        pubkey.className = 'card-pubkey';
        pubkey.textContent = `Pubkey: ` + pubkeyBase32.slice(0,16) + '...';
        card.appendChild(pubkey);

        var button = document.createElement('button');
        button.className = 'card-button';
        button.textContent = 'Copy Pubkey';
        button.addEventListener('click', function () {
            copyToClipboard(pubkeyBase32);
            alert('Copied Pubkey.');
        });
        card.appendChild(button);

        meTabContent.appendChild(card);
    });



    tabButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            var targetTab = this.dataset.tab;

            // Hide all tab contents and make all tabs gray
            tabContents.forEach(function (content) {
                content.classList.add('hidden');
            });
            tabButtons.forEach(function (button) {
                button.classList.remove('text-black');
                button.classList.add('text-gray-500');
            });

            // Show target tab content and make the tab black
            document.getElementById(targetTab).classList.remove('hidden');
            this.classList.remove('text-gray-500');
            this.classList.add('text-black');
        });
    });
    document.querySelector(`button[data-tab="tab3"]`).click();



    decryptButton.addEventListener('click', function () {
        // Get the received payload
        var payload = document.querySelector('#input-ciphertext').value;

        // Decode the Base4096 encoded payload
        var decodedPayload = fromBase4096(payload);
        var messageParts = decode_msg(decodedPayload);

        // Lookup mailboxes
        var matchedKeypair = null;
        for (var i = 0; i < mailboxes.length; i++) {
            // Compare the first 8 bytes of the public keys
            var pubKeyArray = new Uint8Array(Object.values(mailboxes[i].publicKey));
            console.log('pubKeyArray');
            console.log(pubKeyArray);
            console.log('messageParts.realpub');
            console.log(messageParts.realpub);
            console.log('messageParts.ciphertext');
            console.log(messageParts.ciphertext);
            console.log('messageParts');
            console.log(messageParts);

            if (nacl.util.encodeBase64(pubKeyArray.slice(0, 3)) === nacl.util.encodeBase64(messageParts.realpub)) {
                matchedKeypair = mailboxes[i];
                break;
            }
        }

        // Check if a matching keypair was found
        if (matchedKeypair === null) {
            alert('Decryption failed. No matching keypair found.');
            return;
        }

        // Decrypt the ciphertext
        try {
            var nonce = messageParts.nonce;
            var ciphertext = messageParts.ciphertext;
            console.log(`ciphertext`)
            console.log(ciphertext)
            console.log(`nonce`)
            console.log(nonce)
            console.log(`messageParts.ephepub`)
            console.log(messageParts.ephepub)
            console.log(`matchedKeypair.secretKey`)
            console.log(matchedKeypair.secretKey)

            let objprivkey = matchedKeypair.secretKey;

            // Convert object to array
            let arrtmp1 = Object.values(objprivkey);

            // Convert array to Uint8Array
            let secretKey = new Uint8Array(arrtmp1);

            console.log(`secretKey`);
            console.log(secretKey);

            var decrypted = nacl.box.open(ciphertext, nonce, messageParts.ephepub, secretKey);

            if (decrypted === null) {
                throw new Error('Decryption failed. Could not open the box.');
            }

            // Write the decrypted cleartext
            document.querySelector('#output-cleartext').value = nacl.util.encodeUTF8(decrypted);
        } catch (error) {
            alert('Decryption failed. Something went wrong: ' + error.message);
        }
    });

    encryptButton.addEventListener('click', function () {
        var recipientPublicKey = recipientInput.value;
        var message = messageInput.value;

        // Validate recipient public key
        if (recipientPublicKey.length !== 56) {
            alert('Invalid recipient public key.');
            return;
        }

        // Validate message
        if (message === '') {
            alert('The message cannot be empty.');
            return;
        }

        // Generate an ephemeral keypair
        var ephemeralKeypair = nacl.box.keyPair();

        // Encrypt message
        var nonce = nacl.randomBytes(24);
        console.log(`nonce`, nonce);
        // var secretKey = nacl.util.decodeBase64(mailboxes[0].secretKey);
        console.log(`recipientPublicKey`, recipientPublicKey);
        var publicKey = new Uint8Array(base32.decode.asBytes(recipientPublicKey));
        var messageUint8 = nacl.util.decodeUTF8(message);
        console.log(`publicKey`, publicKey);
        console.log(`messageUint8`, messageUint8);
        var encrypted = nacl.box(messageUint8, nonce, publicKey, ephemeralKeypair.secretKey);
        console.log(`encrypted`, encrypted);

        // Include the public key of the ephemeral keypair within the final output message
        var encoded = encode_msg(publicKey.slice(0, 3), ephemeralKeypair.publicKey, nonce, encrypted);
        console.log(`encoded`);
        console.log(encoded);
        console.log(`decode_msg(encoded)`);
        console.log(decode_msg(encoded));
        console.log(decode_msg(encoded).realpub);
        console.log(decode_msg(encoded).encrypted);

        // Convert the final output message to a Base4096 representation
        currentCiphertext = toBase4096(encoded);
        console.log(`currentCiphertext`);
        console.log(currentCiphertext);
        document.getElementById('output-ciphertext').value = currentCiphertext;

        // Enable the copy button
        copyButton.disabled = false;
    });


    copyButton.addEventListener('click', function () {
        copyToClipboard(currentCiphertext);
        alert('Copied ciphertext. Send it to your recipient.');
    });
    copyButtonForDecrypted.addEventListener('click', function () {
        copyToClipboard(currentCiphertext);
        alert('Copied cleartext.');
    });
});
