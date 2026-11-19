// Landing route for the Google sign-in redirect (tutorfren://auth-callback / exp://…/--/auth-callback).
// The in-app browser hands the URL to GoogleButton; if the system opens this route instead, go home.
import { Redirect } from "expo-router";
export default function AuthCallback() {
  return <Redirect href="/" />;
}
