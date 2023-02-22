import React, { useState, useEffect } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButton, IonCol, IonGrid, IonRow, IonContent, IonLabel } from '@ionic/react';
import './Page1.css';
import { GoogleOneTapAuth, SignInResultOption, SuccessSignInResult, NoSuccessSignInResult } from 'capacitor-native-google-one-tap-signin';

const clientId = '333448133894-m88bqcrq93ao7vi2j4o475fnlbsnhc9g.apps.googleusercontent.com';

const Page1: React.FC = () => {
  const [oneTapAuthResult, setAuthResult] = useState('');

  useEffect(() => {
    GoogleOneTapAuth.initialize({ clientId: clientId });
  }, []);

  async function triggerGoogleAutoOrOneTapSignInShowSignInButtonIfNotSuccessfulHandler() {
    setAuthResult('');
    try {
      const signInResult = await GoogleOneTapAuth.tryAutoOrOneTapSignIn().then(res => res.signInResultOptionPromise);
      reportSignInResult(signInResult);
      if (!signInResult.isSuccess) { 
        const successResult = await renderSignInButton();
        reportSignInResultSuccess(successResult);
      }
    } catch(e) {
      setAuthResult(`Something unexpected happened. Message: '${e}', Stack: ${new Error().stack}`);
    }
  }

  async function triggerGoogleAutoOrOneTapSignInAndShowSignInButtonHandler() {
    setAuthResult('');
    try {
      const autoOrOneTapSuccessPromise = GoogleOneTapAuth.tryAutoOrOneTapSignIn().then(res => res.successPromise);
      const renderButtonPromise = renderSignInButton();
      const signInResultSuccess = await Promise.race([autoOrOneTapSuccessPromise, renderButtonPromise]);
      reportSignInResultSuccess(signInResultSuccess);
    } catch(e) {
      setAuthResult(`Something unexpected happened. Message: '${e}', Stack: ${new Error().stack}`);
    }
  }

  async function renderButtonHandler() {
    const successResult = await renderSignInButton();
    reportSignInResultSuccess(successResult);
  }

  function renderSignInButton() {
    return GoogleOneTapAuth.renderSignInButton('google-signin', {}, { locale: 'en-GB', theme: 'outline', text: 'continue_with', shape: 'rectangular', size: 'large' });
  }

  function reportSignInResult(signInResultOption: SignInResultOption) {
    if (signInResultOption.isSuccess) {
      reportSignInResultSuccess(signInResultOption.success!);
    } else {
      reportSignInResultError(signInResultOption.noSuccess!);
    }
  }

  function reportSignInResultSuccess(successResult: SuccessSignInResult) {
    setAuthResult(`SignIn success! email: '${successResult.email}', userId: '${successResult.userId}', selectBy: '${successResult.selectBy}', nonce: '${successResult.decodedIdToken.nonce}'. See browser console for idToken and full result.`);
    console.log('Success! ' + JSON.stringify(successResult));
  }

  function reportSignInResultError(noSuccessResult: NoSuccessSignInResult) {
    setAuthResult(`SignIn not successful. noSuccessReasonCode: '${noSuccessResult.noSuccessReasonCode}', noSuccessAdditionalInfo: '${noSuccessResult.noSuccessAdditionalInfo}'`);
    console.log('No success! ' + JSON.stringify(noSuccessResult));
  }

  async function signOutGoogleHandler() {
    setAuthResult('');
    const signOutResult = await GoogleOneTapAuth.signOut();

    if (signOutResult.isSuccess) {
      setAuthResult('SignOut success');
    } else {
      setAuthResult(`SignOut error: ${signOutResult.error}`);
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
              <IonButton onClick={() => triggerGoogleAutoOrOneTapSignInShowSignInButtonIfNotSuccessfulHandler()}>
                Sign-in then show button
              </IonButton>
            </IonCol>
            <IonCol>Trigger one-tap sign-in either automatic or with one-tap and, if not successful, show Sign-in-with-google button.</IonCol>
          </IonRow>
          <IonRow>
            <IonCol size='auto'>
              <IonButton onClick={() => triggerGoogleAutoOrOneTapSignInAndShowSignInButtonHandler()}>
                Sign-in and show button
              </IonButton>
            </IonCol>
            <IonCol>Trigger one-tap sign-in either automatic or with one-tap and, at the same time, show Sign-in-with-google button.</IonCol>
          </IonRow>
          <IonRow>
            <IonCol size='auto'>
              <IonButton onClick={() => renderButtonHandler()}>
                Render sign-in button
              </IonButton>
            </IonCol>
            <IonCol></IonCol>
          </IonRow>
          <IonRow>
            <IonCol size='auto'>
              <div id="google-signin"></div>
            </IonCol>
            <IonCol></IonCol>
          </IonRow>
          <IonRow>
            <IonCol size='auto'>
              <IonButton onClick={() => signOutGoogleHandler()}>
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
