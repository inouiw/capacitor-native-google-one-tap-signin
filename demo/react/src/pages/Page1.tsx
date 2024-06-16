import React, { useState, useEffect, useCallback } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButton, IonCol, IonGrid, IonRow, IonContent, IonLabel } from '@ionic/react';
import './Page1.css';
import { GoogleOneTapAuth, SignInResultOption, SuccessSignInResult, NoSuccessSignInResult } from 'capacitor-native-google-one-tap-signin';

const clientId = '333448133894-m88bqcrq93ao7vi2j4o475fnlbsnhc9g.apps.googleusercontent.com';

async function triggerGoogleAutoOrOneTapSignInAndShowSignInButtonHandler(onResult: (signInResultOption: SignInResultOption) => void) {
  const onResultHandler = async (signInResultOption: SignInResultOption) => {
    if (signInResultOption.isSuccess) {
      // If the user signed-in with the button, the UI may still be shown. So close it.
      await GoogleOneTapAuth.cancelOneTapDialog();
      onResult(signInResultOption);
    }
  }
  await GoogleOneTapAuth.tryAutoOrOneTapSignInWithCallback(onResultHandler);
  await renderSignInButtonWithCallback(onResultHandler);
}

async function renderButtonHandler(onResult: (signInResultOption: SignInResultOption) => void) {
  await renderSignInButtonWithCallback(onResult);
}

async function addSignInActionToExistingButton(onResult: (signInResultOption: SignInResultOption) => void) {
  await GoogleOneTapAuth.addSignInActionToExistingButtonWithCallback('google-signin-existing-btn-parent', 'google-signin-existing-btn', onResult);
}

function renderSignInButtonWithCallback(onResult: (signInResultOption: SignInResultOption) => void) {
  return GoogleOneTapAuth.renderSignInButtonWithCallback('google-signin', {}, { type: 'standard', locale: 'en-GB', theme: 'outline', text: 'continue_with', shape: 'rectangular', size: 'large' }, onResult);
}

async function signOutHandler(onResultStatus: (status: string) => void) {
  const signOutResult = await GoogleOneTapAuth.signOut();

  if (signOutResult.isSuccess) {
    onResultStatus('SignOut success');
  } else {
    onResultStatus(`SignOut error: ${signOutResult.error}`);
  }
}

async function disconnectHandler(onResultStatus: (status: string) => void) {
  const disconnectResult = await GoogleOneTapAuth.disconnect();

  if (disconnectResult.isSuccess) {
    onResultStatus('Disconnect success');
  } else {
    onResultStatus(`Disconnect error: ${disconnectResult.error}`);
  }
}

const Page1: React.FC = () => {
  const [oneTapAuthResult, setAuthResult] = useState('');

  const reportSignInResult = useCallback((signInResultOption: SignInResultOption) => {
    if (signInResultOption.isSuccess) {
      reportSignInResultSuccess(signInResultOption.success!);
    } else {
      reportSignInResultError(signInResultOption.noSuccess!);
    }
  }, []);

  useEffect(() => {
    // It is allowed but not needed to await initialize.
    void GoogleOneTapAuth.initialize({ clientId: clientId });

    addSignInActionToExistingButton(reportSignInResult);
  }, [reportSignInResult]);

  function reportSignInResultSuccess(successResult: SuccessSignInResult) {
    setAuthResult(`SignIn success! email: '${successResult.email}', userId: '${successResult.userId}', isAutoSelected: '${successResult.isAutoSelected}', nonce: '${successResult.decodedIdToken.nonce}'. See browser console for idToken and full result.`);
    console.log('Success! ' + JSON.stringify(successResult));
  }

  function reportSignInResultError(noSuccessResult: NoSuccessSignInResult) {
    setAuthResult(`SignIn not successful. noSuccessReasonCode: '${noSuccessResult.noSuccessReasonCode}', noSuccessAdditionalInfo: '${noSuccessResult.noSuccessAdditionalInfo}'`);
    console.log('No success! ' + JSON.stringify(noSuccessResult));
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
              <IonButton onClick={() => { setAuthResult(''); triggerGoogleAutoOrOneTapSignInAndShowSignInButtonHandler(reportSignInResult) }}>
                Sign-in and show button
              </IonButton>
            </IonCol>
            <IonCol style={{ minWidth: '200px' }}>Trigger one-tap sign-in first automatic then with one-tap and, at the same time, show Sign-in-with-google button.</IonCol>
          </IonRow>
          <IonRow>
            <IonCol size='auto'>
              <IonButton onClick={() => { setAuthResult(''); GoogleOneTapAuth.tryAutoOrOneTapSignInWithCallback(reportSignInResult) }}>
                Sign-in
              </IonButton>
            </IonCol>
            <IonCol style={{ minWidth: '200px' }}>Trigger one-tap sign-in first automatic then with one-tap.</IonCol>
          </IonRow>
          <IonRow>
            <IonCol size='auto'>
              <IonButton onClick={async () => { setAuthResult(''); reportSignInResult(await GoogleOneTapAuth.signInWithGoogleButtonFlowForNativePlatform()) }}>
                Sign-in with google button flow for native platforms
              </IonButton>
            </IonCol>
            <IonCol style={{ minWidth: '200px' }}>Trigger Sign in with Google button for native platforms.</IonCol>
          </IonRow>
          <IonRow>
            <IonCol size='auto'>
              <IonButton onClick={() => { setAuthResult(''); renderButtonHandler(reportSignInResult) }}>
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
              <div id='google-signin-existing-btn-parent'>
                <button id='google-signin-existing-btn' style={{ padding: 20, backgroundColor: '#3dc418' }}>Custom Sign-in Button</button>
              </div>
            </IonCol>
            <IonCol></IonCol>
          </IonRow>
          <IonRow>
            <IonCol size='auto'>
              <IonButton onClick={() => { setAuthResult(''); signOutHandler(setAuthResult) }}>
                Sign-out
              </IonButton>
            </IonCol>
            <IonCol></IonCol>
          </IonRow>
          <IonRow>
            <IonCol size='auto'>
              <IonButton onClick={() => { setAuthResult(''); disconnectHandler(setAuthResult) }}>
                Disconnect
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
