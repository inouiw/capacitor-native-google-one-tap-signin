import React, { useState, useEffect } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButton, IonCol, IonGrid, IonRow, IonContent, IonLabel } from '@ionic/react';
import './Page1.css';
import { GoogleOneTapAuth, SignInResult, SignOutResult } from 'capacitor-native-google-one-tap-signin';

const clientId = '333448133894-oo2gapskrr4j7p7gg5kn6b0sims22mcu.apps.googleusercontent.com';

const Page1: React.FC = () => {
  const [oneTapAuthResult, setOneTapAuthResult] = useState('');

  useEffect(() => {
    GoogleOneTapAuth.initialize();
  }, []);

  async function signInGoogle() {
    setOneTapAuthResult('');
    let signInResult = await GoogleOneTapAuth.tryAutoSignInThenTrySignInWithPrompt({ clientId: clientId });
    if (!signInResult.isSuccess) {
      signInResult = await GoogleOneTapAuth.renderButton('appleid-signin', { clientId: clientId }, { locale: 'en-us' });
    }
    reportSignInResult(signInResult);
  }

  function reportSignInResult(signInResult: SignInResult) {
    if (signInResult.isSuccess) {
      setOneTapAuthResult(`SignIn success! email: '${signInResult.email}', selectBy: '${signInResult.selectBy}'. See browser console for idToken and full result.`);
      console.log('Success! ' + JSON.stringify(signInResult));
    } else {
      setOneTapAuthResult(`SignIn not successful. Reason: ${signInResult.noSuccessReasonCode}`);
      console.log('No success! ' + JSON.stringify(signInResult));
    }
  }

  async function signOutGoogle() {
    setOneTapAuthResult('');
    const signOutResult = await GoogleOneTapAuth.signOut();

    if (signOutResult.isSuccess) {
      setOneTapAuthResult('SignOut success');
    } else {
      setOneTapAuthResult(`SignOut error: ${signOutResult.error}`);
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>capacitor-native-google-one-tap-signin Demo App</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent class="ion-padding">
        <IonGrid fixed={true}>
          <IonRow>
            <IonCol size='auto'>
              <IonButton onClick={() => signInGoogle()}>
                Trigger auto-sign-in
              </IonButton>
              <div id="appleid-signin" data-color="black" data-border="true" data-type="continue" data-width="210" data-height="40"></div>
            </IonCol>
            <IonCol>Trigger one-tap auto-sign-in and show Sign-in-with-google button if auto-sign-in is not possible.</IonCol>
          </IonRow>
          <IonRow>
            <IonCol size='auto'>
              <IonButton onClick={() => signOutGoogle()}>
                Sign-out
              </IonButton>
            </IonCol>
            <IonCol></IonCol>
          </IonRow>
          <IonRow>
            <IonCol size='12'>
              <IonLabel class="ion-text-wrap" color='secondary'>{oneTapAuthResult}</IonLabel>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Page1;
