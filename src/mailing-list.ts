import { initializeApp } from "./main.js";
import { createMessage } from "./modules/utils.js";

const mailingForm = document.getElementById("mailing-list-form") as HTMLFormElement;

async function submitData(form: HTMLFormElement) {
    const formData: FormData = new FormData(form);
    const fullName = formData.get("fullName");
    if (fullName && fullName.toString() != '') {

    } else {
        createMessage("Please enter your name", "main-message", "error");
        return;
    }
    const email = formData.get("email");
    if (email && email.toString() != '') {
        if (!email.toString().includes("@")) {
            createMessage("Please enter a valid email", "main-message", "error");
            return;
        }
    } else {
        createMessage("Please enter your email", "main-message", "error");
        return;
    }
    const phoneNumber = formData.get("phone");
    if (phoneNumber) {
        const cleaned: string = phoneNumber.toString().replace(/[^\d]/g, "");
        if (cleaned.length < 10 || cleaned.length > 11) {
            createMessage("Please enter a valid phone number", "main-message", "error");
            return;
        }
    }
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