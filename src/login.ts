import { signInWithGooglePopup } from "./firebase/authService";
import { createMessage, storeMessage } from "./modules/utils";
import { navigateTo } from "./modules/navigate";
import './css/style.css';
import './css/grid.css';
import './css/form.css';
import './css/quill.css';

createMessage({messageBody: "Opening Google sign-in window", location: "main-message", type: "info"});
try {
      const result = await signInWithGooglePopup();
      //If successful sign in with Google, close the modal and display the message
      const user = result.user;
      if (user) {
        //Close the sign in modal
        storeMessage({messageBody: `Welcome ${user.displayName}`, location: "main-message", type: "check_circle", autoCloseSeconds: 5});
        navigateTo("/");
      }
    } catch (error: any) {
        let errorMessage = "Google sign-in failed"
      if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-In window closed";
      } else if (error.code === "auth/cancelled-popup-request") {
        errorMessage = "Sign-In request already in progress";
      } else {
        errorMessage = `Error: ${error.message}`;
      }
      createMessage({messageBody: errorMessage, location: "main-message", type: "error"});
      console.error("Google sign-in error details:", error);
    }