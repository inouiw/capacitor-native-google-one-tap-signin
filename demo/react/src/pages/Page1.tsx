import React, { useState } from 'react';
import { IonPage, IonButton, IonTextarea } from '@ionic/react';
import './Page1.css';
import { GoogleOneTapAuth } from 'capacitor-native-google-one-tap-signin';

const Page1: React.FC = () => {
  const [oneTapAuthResult, setOneTapAuthResult] = useState('');

  async function signInGoogle() {
    setOneTapAuthResult('');
    try
    {
      const user = await GoogleOneTapAuth.signIn();
      let result = `id: ${user.id}`;
      result += `, idToken: ${user.idToken}`;
      result += `, displayName: ${user.displayName}`;
      result += `, givenName: ${user.givenName}`;
      result += `, familyName: ${user.familyName}`;
      result += `, profilePictureUri: ${user.profilePictureUri}`;
      console.log(result);
      setOneTapAuthResult(`signIn success. \nid: ${user.id}\nSee browser console for full result.`);
    }
    catch(ex)
    {
      setOneTapAuthResult(`error: ${ex}, additionalData: ${JSON.stringify(ex)}`);
    }
  }

  async function signOutGoogle() {
    setOneTapAuthResult('');
    try
    {
      await GoogleOneTapAuth.signOut();
      setOneTapAuthResult('signOut without error');
    }
    catch(ex)
    {
      setOneTapAuthResult(`error: ${ex}, additionalData: ${JSON.stringify(ex)}`);
    }
  }

  return (
    <IonPage>
      <div className="container">
        <IonButton onClick={() => signInGoogle()}>
          Continue with Google
        </IonButton>
        <IonButton onClick={() => signOutGoogle()}>
          Sign-out
        </IonButton>
        <br />
        <IonTextarea value={oneTapAuthResult} readonly={false} autoGrow={true} inputMode='none'></IonTextarea>
      </div>
    </IonPage>
  );
};

export default Page1;
