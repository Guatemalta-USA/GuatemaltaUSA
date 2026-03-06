import { signInWithGooglePopup } from "./firebase/authService";
import { createMessage, storeMessage } from "./modules/utils";
import { navigateTo } from "./modules/navigate";

createMessage("Opening Google sign-in window", "main-message", "info");
try {
      const result = await signInWithGooglePopup();
      //If sucessful sign in with Google, close the modal and display the message
      const user = result.user;
      if (user) {
        //Close the sign in modal
        storeMessage(`Welcome ${user.displayName}`, "main-message", "check_circle");
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
      createMessage(errorMessage, "main-message", "error");
      console.error("Google sign-in error details:", error);
    }
