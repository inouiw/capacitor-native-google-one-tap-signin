import React, { useState } from 'react';
import { IonPage, IonButton, IonTextarea } from '@ionic/react';
import './Page1.css';
import { GoogleOneTapAuth } from 'capacitor-native-google-one-tap-signin';

const Page1: React.FC = () => {
  const [signInResult, setSignInResult] = useState('');

  async function signInGoogle() {
    try
    {
      const user = await GoogleOneTapAuth.signIn();
      setSignInResult(`id: ${user.id}, idToken: ${user.idToken}`);
    }
    catch(ex)
    {
      setSignInResult(`error: ${ex}, additionalData: ${JSON.stringify(ex)}`);
    }
  }

  return (
    <IonPage>
      <div className="container">
        <IonButton onClick={() => signInGoogle()}>
          Continue with Google
        </IonButton>
        <br />
        <IonTextarea value={signInResult} readonly={false} autoGrow={true} inputMode='none'></IonTextarea>
      </div>
    </IonPage>
  );
};

export default Page1;
