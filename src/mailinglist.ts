import { initializeApp } from "./main.js";
import { navigateTo } from "./modules/navigate.js";
import { createMessage, storeMessage } from "./modules/utils.js";

const mailingForm = document.getElementById("mailing-list-form") as HTMLFormElement;

async function submitData(form: HTMLFormElement) {
    const formData: FormData = new FormData(form);
    const fullName = formData.get("entry.2062710097");
    if (fullName && fullName.toString() != '') {

    } else {
        createMessage("Please enter your name", "main-message", "error");
        return;
    }
    const email = formData.get("entry.1184904406");
    if (email && email.toString() != '') {
        if (!email.toString().includes("@")) {
            createMessage("Please enter a valid email", "main-message", "error");
            return;
        }
    } else {
        createMessage("Please enter your email", "main-message", "error");
        return;
    }
    const phoneNumber = formData.get("entry.1221140327");
    if (phoneNumber) {
        const cleaned: string = phoneNumber.toString().replace(/[^\d]/g, "");
        if (cleaned.length < 10 || cleaned.length > 11) {
            createMessage("Please enter a valid phone number", "main-message", "error");
            return;
        }
    }

    const formAction: string =
        "https://docs.google.com/forms/d/e/1FAIpQLSd6Z4LcI8zNBdfC6MHtlMgv_hni0nBwVTctRW2_wS_RR7PRUA/formResponse";
    fetch(formAction, {
        method: "POST",
        body: formData,
        mode: "no-cors",
    })
        .then((response) => {
            //Store the message to be displayed after redirected to the home page
            console.log(response);
            storeMessage(
                "You have successfully signed up for our mailing list",
                "main-message",
                "check_circle",
            );
            navigateTo("/");
        })
        .catch((error) => {
            //Create an error message
            console.error("Network Error:", error);
            createMessage(
                "Error signing up. Please reload the page and try again",
                "main-message",
                "error",
            );
        });
}


initializeApp("Mailing List", "Mailing List").then(async () => {
    mailingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        submitData(mailingForm);
    });
    mailingForm.addEventListener('invalid', (event: Event) => {
        event.preventDefault();
        const target = event.target as HTMLInputElement;
        alert(target)
    }, true);
});