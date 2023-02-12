import React, { useState, useEffect } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButton, IonCol, IonGrid, IonRow, IonContent, IonLabel } from '@ionic/react';
import './Page1.css';
import { GoogleOneTapAuth, SignInResult } from 'capacitor-native-google-one-tap-signin';

const clientId = '333448133894-m88bqcrq93ao7vi2j4o475fnlbsnhc9g.apps.googleusercontent.com';

const Page1: React.FC = () => {
  const [oneTapAuthResult, setOneTapAuthResult] = useState('');

  useEffect(() => {
    GoogleOneTapAuth.initialize();
  }, []);

  async function signInGoogle() {
    setOneTapAuthResult('');
    let signInResult = await GoogleOneTapAuth.tryAutoSignIn({ clientId: clientId });
    reportSignInResult(signInResult);
    // if (!signInResult.isSuccess) {
    //   signInResult = await GoogleOneTapAuth.renderButton('appleid-signin', { clientId: clientId }, { locale: 'en-us', theme: 'outline', text: 'continue_with', shape: 'rectangular' });
    // }
    // reportSignInResult(signInResult);
  }

  function reportSignInResult(signInResult: SignInResult) {
    if (signInResult.isSuccess) {
      setOneTapAuthResult(`SignIn success! email: '${signInResult.email}', userId: '${signInResult.userId}' selectBy: '${signInResult.selectBy}'. See browser console for idToken and full result.`);
      console.log('Success! ' + JSON.stringify(signInResult));
    } else {
      setOneTapAuthResult(`SignIn not successful. noSuccessReasonCode: '${signInResult.noSuccessReasonCode}', noSuccessAdditionalInfo: '${signInResult.noSuccessAdditionalInfo}'`);
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
