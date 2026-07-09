import { Donor, Message, SOCIAL_DATA, type KeyValue } from "../models";
import { Timestamp } from "firebase/firestore";

export function createButton(
  buttonText: string,
  buttonType: string,
  buttonId: string,
  buttonClass: string,
  icon?: string,
): HTMLElement {
  const newButton = document.createElement("button");
  newButton.setAttribute("type", buttonType);
  newButton.setAttribute("id", buttonId);
  newButton.setAttribute("class", buttonClass);
  if (icon) {
    const buttonIconSpan = document.createElement("span");
    buttonIconSpan.setAttribute("class", "material-symbols-outlined");
    const buttonIcon = document.createTextNode(icon);
    buttonIconSpan.appendChild(buttonIcon);
    newButton.appendChild(buttonIconSpan);
  }
  const buttonTextElm = document.createTextNode(buttonText);
  newButton.appendChild(buttonTextElm);
  return newButton;
}

export function createLink(linkText: string, url: string, external: boolean) {
  const newLink = document.createElement("a")
  newLink.textContent = linkText;
  if (url != "") {
    newLink.setAttribute("href", url);
  }
  if (external) {
    newLink.setAttribute("target", "_blank");
  }
  return newLink;
}

export function createMessage(message: string, location: string, type: string) {
  clearMessages();
  const messageWrapper = document.getElementById(location) as HTMLElement;
  const messageDiv = document.createElement("div");
  if (type === "check_circle") {
    messageDiv.setAttribute("class", "success message");
    messageDiv.setAttribute("aria-live", "polite");
  } else if (type === "error") {
    messageDiv.setAttribute("class", "error message");
    messageDiv.setAttribute("role", "alert");
    console.error(message);
  } else if (type === "delete" || type === "warn") {
    messageDiv.setAttribute("class", "warn message");
    messageDiv.setAttribute("aria-live", "polite");
    console.warn(message);
  } else {
    messageDiv.setAttribute("class", "info message");
    messageDiv.setAttribute("aria-live", "polite");
  }
  const icon = document.createElement("span");
  icon.setAttribute("class", "material-symbols-outlined");
  const iconName = document.createTextNode(type);
  icon.appendChild(iconName);
  messageDiv.appendChild(icon);
  const messageText = document.createTextNode(message);
  messageDiv.appendChild(messageText);
  const closeButton = createButton("", "button", "closeButton", "", "close");
  closeButton.addEventListener("click", () => (messageWrapper.innerHTML = ""));
  messageDiv.appendChild(closeButton);
  messageWrapper.appendChild(messageDiv);
}

export function createTableHeader(tableHeadings: string[], textAlign: string) {
  const tableHead = tableHeadings.reduce((acc: HTMLElement, currentHeading: string) => {
    const newColumnHeader = makeElement("th", null, textAlign, null);
    const columnHeaderName = document.createTextNode(currentHeading);
    newColumnHeader.appendChild(columnHeaderName);
    acc.appendChild(newColumnHeader);
    return acc;
  }, document.createElement("thead"));
  return tableHead;
}

export function createSimpleTableRow(rowCells: string[], isHTML: boolean) {
  if (isHTML) {
    const tableRow = rowCells.reduce((acc: HTMLElement, currentCell: string) => {
      const newCell = document.createElement("td");
      newCell.innerHTML = currentCell;
      acc.appendChild(newCell);
      return acc;
    }, document.createElement("tr"));
    return tableRow;
  } else {
    const tableRow = rowCells.reduce((acc: HTMLElement, currentCell: string) => {
      const newCell = makeElement("td", null, null, currentCell);
      acc.appendChild(newCell);
      return acc;
    }, document.createElement("tr"));
    return tableRow;
  }
}

export function createSocialLink(platformKey: string, size: number = 24): HTMLAnchorElement | null {
  const data = SOCIAL_DATA[platformKey.toLowerCase()];
  if (!data) return null;

  const link = document.createElement('a');
  link.href = data.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.classList.add('social-link');

  // Custom property to tell CSS what the brand color is
  link.style.setProperty('--brand-color', data.brandColor);

  link.innerHTML = `
    <svg viewBox="${data.viewBox}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      ${data.content}
    </svg>
    <span class="social-text">${data.name}</span>
  `;

  return link;
}

export function clearMessages() {
  const messageWrappers = document.getElementsByClassName("message-wrapper");
  for (const messageWrapper of messageWrappers) {
    messageWrapper.innerHTML = "";
  }
}

export function storeMessage(
  message: string,
  messageContainer: string,
  icon: string,
) {
  clearMessages();
  const messageToStore = new Message(message, messageContainer, icon);
  sessionStorage.setItem("message", JSON.stringify(messageToStore));
}

export function fixDate(
  dateString: string | Timestamp,
  dateFormat: string,
): string {
  let dateObj: Date = new Date(0);
  //If Timestamp, convert it to a date object
  if (dateString instanceof Timestamp) {
    dateObj = dateString.toDate();
  }
  //If string, create a new date object
  else if (typeof dateString === "string") {
    dateObj = new Date(dateString);
  }
  //Check if the date object is valid
  if (isNaN(dateObj.getTime())) {
    console.error(
      "fixDate received an invalid date object after parsing:",
      dateString,
    );
    return "Invalid Date";
  }
  //Add timezone to fix date off by one error (with help from stackOverflow thread: https://stackoverflow.com/questions/7556591/is-the-javascript-date-object-always-one-day-off)
  let dateTimezoneFixed: Date = new Date(
    dateObj.getTime() - dateObj.getTimezoneOffset() * -60000,
  );
  //Define formatting options
  const options: Intl.DateTimeFormatOptions =
    dateFormat === "shortDate"
      ? { month: "2-digit", day: "2-digit", year: "numeric" }
      : { month: "long", day: "2-digit", year: "numeric" };
  return dateTimezoneFixed.toLocaleDateString("en-US", options);
}

export function makeElement(elementType: string, elementId: string | null, elementClass: string | null, elementText: string | null) {
  const newElement = document.createElement(elementType);
  if (elementId) newElement.setAttribute('id', elementId);
  if (elementClass) {
    newElement.setAttribute('class', elementClass);
  }
  if (elementText) newElement.textContent = elementText;
  return newElement;
}

export function makePBLock(pParts: KeyValue[]) {
  return pParts.reduce((acc: HTMLElement, currentPart: KeyValue) => {
    const nextPart = makeElement(currentPart[0], null, null, currentPart[1]);
    acc.appendChild(nextPart);
    return acc;
  }, document.createElement("p"));
}

export async function confirmDeleteModal(messageHeader: string, messageBody: string): Promise<boolean> {
  return new Promise((resolve) => {
    const modalRoot = makeElement("div", "modal-root", null, null);
    const modalOverlay = makeElement("div", null, "modal-overlay", null);
    const modalContent = makeElement("div", null, "modal-content", null);

    const modalH2 = makeElement("h2", null, null, messageHeader);
    modalContent.appendChild(modalH2);

    const modalMessage = makeElement("p", null, null, messageBody);
    modalContent.appendChild(modalMessage);

    const formRow = makeElement("div", null, "button-row", null);

    const closeModal = () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.removeChild(modalRoot);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
        resolve(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    const deleteButton = createButton("Delete", "button", "delete-btn", "error button", "delete");
    deleteButton.onclick = function () {
      closeModal();
      resolve(true);
    };
    formRow.appendChild(deleteButton);

    const cancelButton = createButton("Cancel", "button", "cancel-btn", "info button", "close");
    cancelButton.onclick = function () {
      closeModal();
      resolve(false);
    };
    formRow.appendChild(cancelButton);

    modalContent.appendChild(formRow);
    modalOverlay.appendChild(modalContent);
    modalRoot.appendChild(modalOverlay);

    modalRoot.style.display = 'flex';
    document.body.appendChild(modalRoot);
  });
}

export async function promptModal(messageHeader: string, placeholderText: string, buttonText: string, required: boolean): Promise<string> {
  return new Promise((resolve) => {
    const modalRoot = makeElement("div", "modal-root", null, null);
    const modalOverlay = makeElement("div", null, "modal-overlay", null);
    const modalContent = makeElement("div", null, "modal-content", null);

    const modalH2 = makeElement("h2", null, null, messageHeader);
    modalContent.appendChild(modalH2);

    const formRow = makeElement("div", null, "form-row", null);
    const userInput = document.createElement("input") as HTMLInputElement;
    userInput.type = "Text";
    userInput.placeholder = placeholderText;
    userInput.id = "userInput";
    userInput.name = "userInput";
    formRow.appendChild(userInput);
    modalContent.appendChild(formRow);

    const buttonRow = makeElement("div", null, "button-row", null);

    const closeModal = () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.removeChild(modalRoot);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
        resolve("");
      }
    };

    const submitBtn = createButton(buttonText, "button", "submit-btn", "accent-button", "add");
    submitBtn.onclick = function () {
      closeModal();
      resolve(userInput.value);
    }
    buttonRow.appendChild(submitBtn);

    const cancelButton = createButton("Cancel", "button", "cancel-btn", "info button", "close");
    cancelButton.onclick = function () {
      closeModal();
      resolve("");
    };

    if (!required) {
      window.addEventListener("keydown", handleKeyDown);
      buttonRow.appendChild(cancelButton);
    }

    modalContent.appendChild(buttonRow);
    modalOverlay.appendChild(modalContent);
    modalRoot.appendChild(modalOverlay);

    modalRoot.style.display = 'flex';
    document.body.appendChild(modalRoot);
  });
}

export function createGiveButterWidget(id: string | null, type: string) {
  const widget = document.createElement("givebutter-widget");
  if (type === "button") {
    if (id) {
      widget.setAttribute("id", id);
    } else {
      widget.setAttribute("id", "gRGya8");
    }
  } else {
    if (id) {
      widget.setAttribute("id", id);
    } else {
      widget.setAttribute("id", "goeb69");
    }
  }
  return widget;

}

export function createInputRow(labelText: string | null, inputType: string, placeholderText: string, id: string): HTMLElement {
  const formRow = makeElement("div", null, "form-row", null);
  if (labelText) {
    const label = document.createElement("label");
    label.textContent = labelText;
    label.setAttribute("for", id);
    formRow.appendChild(label);
  }
  const input = document.createElement("input") as HTMLInputElement;
  input.type = inputType;
  input.placeholder = placeholderText;
  input.id = id;
  input.name = id;
  formRow.appendChild(input);

  return formRow;
}

export function createTableRow(dataRow: (string | number | null)[]): HTMLTableRowElement {
  const tr = document.createElement("tr");
  dataRow.forEach((value) => {
    const td = document.createElement("td");
    if (!value) {
      td.textContent = "";
    } else {
      td.textContent = value.toString();
    }
    tr.appendChild(td);
  });

  return tr;
}