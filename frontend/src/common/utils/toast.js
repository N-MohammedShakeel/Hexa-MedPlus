import { toast } from "react-toastify";

export function notifySuccess(message) {
  return toast.success(message);
}

export function notifyError(message) {
  return toast.error(message);
}

export function notify(message) {
  return toast(message);
}
