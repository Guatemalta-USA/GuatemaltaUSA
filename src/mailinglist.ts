import { initializeApp } from "./main.js";
import { navigateTo } from "./modules/navigate.js";
import { createMessage, storeMessage } from "./modules/utils.js";
import './css/style.css';
import './css/grid.css';
import './css/form.css';
import './css/quill.css';

//https://stefano.brilli.me/google-forms-html-exporter/

const mailingForm = document.getElementById("mailing-list-form") as HTMLFormElement;

async function submitData(form: HTMLFormElement) {
    const formData: FormData = new FormData(form);
    const firstName = formData.get("entry.1268567619");
    if (firstName && firstName.toString() !== '') {

    } else {
        createMessage("Please enter your first name", "main-message", "error");
        return;
    }
    const lastName = formData.get("entry.116201782");
    if (lastName && lastName.toString() !== "") {

    } else {
        createMessage("Please enter your last name", "main-message", "error");
        return;
    }
    const email = formData.get("entry.1067526779");
    if (email && email.toString() !== '') {
        if (!email.toString().includes("@")) {
            createMessage("Please enter a valid email", "main-message", "error");
            return;
        }
    } else {
        createMessage("Please enter your email", "main-message", "error");
        return;
    }
    const phoneNumber = formData.get("entry.1476933979");
    if (phoneNumber) {
        const cleaned: string = phoneNumber.toString().replace(/[^\d]/g, "");
        if (cleaned.length < 10 || cleaned.length > 11) {
            createMessage("Please enter a valid phone number", "main-message", "error");
            return;
        }
    }

    const formAction: string =
        "https://docs.google.com/forms/d/e/1FAIpQLScfzvbbYF0uaPk7fVusRLZ976_PwZMk7qXw2MGw6o8M-fb6Sg/formResponse";
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