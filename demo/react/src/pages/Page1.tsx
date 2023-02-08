import React, { useState, useEffect } from 'react';
import { IonPage, IonButton, IonTextarea } from '@ionic/react';
import './Page1.css';
import { GoogleOneTapAuth } from 'capacitor-native-google-one-tap-signin';
import SignInWithGoogleButton from 'reactsigninwithgooglebutton';

const clientId = '333448133894-oo2gapskrr4j7p7gg5kn6b0sims22mcu.apps.googleusercontent.com';

const Page1: React.FC = () => {
  const [oneTapAuthResult, setOneTapAuthResult] = useState('');

  useEffect(() => {
    //GoogleOneTapAuth.initialize();
  }, []);

  function initGapi() {
    GoogleOneTapAuth.initialize();
  }

  async function renderButton() {
    const signInResult = await GoogleOneTapAuth.renderButton('appleid-signin', { clientId: clientId }, { locale: 'en-us' });
    setOneTapAuthResult(`signIn success. \nemail: ${signInResult.decodedIdToken.email}\nSee browser console for full result.`);
    console.log('login success' + JSON.stringify(signInResult));
  }

  async function autoSignInGoogle() {
    try {
      const signInResult = await GoogleOneTapAuth.tryAutoSignIn({ clientId: clientId });
      console.log(signInResult);
      setOneTapAuthResult(`signIn success. \nemail: ${signInResult.decodedIdToken.email}\nSee browser console for full result.`);
    }
    catch (ex) {
      setOneTapAuthResult(formatError(ex));
    }
  }

  async function signInGoogle() {
    setOneTapAuthResult('');
    try {
      const signInResult = await GoogleOneTapAuth.tryAutoSignInThenTrySignInWithPrompt({ clientId: clientId });
      console.log(signInResult);
      setOneTapAuthResult(`signIn success. \nemail: ${signInResult.decodedIdToken.email}\nSee browser console for full result.`);
    }
    catch (ex) {
      setOneTapAuthResult(formatError(ex));
      const signInResult = await GoogleOneTapAuth.renderButton('appleid-signin', { clientId: clientId }, { locale: 'en-us' });
      setOneTapAuthResult(`signIn success. \nemail: ${signInResult.decodedIdToken.email}\nSee browser console for full result.`);
      console.log('login success' + JSON.stringify(signInResult));
    }
  }

  function formatError(error: unknown) {
    let result = `error: ${error}`;
    // if ((error as string).startsWith('{')) {
    //   result += `, additionalData: ${JSON.stringify(error)}`
    // }
    return result;
  }

  async function signOutGoogle() {
    setOneTapAuthResult('');
    try {
      await GoogleOneTapAuth.signOut();
      setOneTapAuthResult('signOut without error');
    }
    catch (ex) {
      setOneTapAuthResult(`error: ${ex}, additionalData: ${JSON.stringify(ex)}`);
    }
  }

  return (
    <IonPage>
      <div className="container">
        <IonButton onClick={() => initGapi()}>
          init
        </IonButton>
        <IonButton onClick={() => renderButton()}>
          Render button
        </IonButton>
        <IonButton onClick={() => autoSignInGoogle()}>
          Trigger auto-sign-in
        </IonButton>
        <SignInWithGoogleButton onClick={() => signInGoogle()} />
        <IonButton onClick={() => signOutGoogle()}>
          Sign-out
        </IonButton>
        <br />
        <div id="appleid-signin" data-color="black" data-border="true" data-type="continue" data-width="210" data-height="40"></div>
        <br />
        <IonTextarea value={oneTapAuthResult} readonly={false} autoGrow={true} inputMode='none'></IonTextarea>
      </div>
    </IonPage>
  );
};

export default Page1;
