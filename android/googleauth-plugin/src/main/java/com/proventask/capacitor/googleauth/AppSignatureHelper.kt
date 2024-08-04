package com.proventask.capacitor.googleauth

import android.content.Context
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Build
import java.security.MessageDigest
import java.security.NoSuchAlgorithmException

object AppSignatureHelper {

    // Returns the package SHA1 key in the format AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF
    fun getSHA1(context: Context): String? {
        try {
            val packageName = context.packageName
            val packageInfo: PackageInfo = context.packageManager.getPackageInfo(packageName, PackageManager.GET_SIGNING_CERTIFICATES)

            val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo.signingInfo?.apkContentsSigners
            } else {
                @Suppress("DEPRECATION")
                packageInfo.signatures
            }

            signatures?.forEach { signature ->
                val md: MessageDigest = MessageDigest.getInstance("SHA1")
                val digest = md.digest(signature.toByteArray())
                return toHexString(digest)
            }
        } catch (e: PackageManager.NameNotFoundException) {
            e.printStackTrace()
        } catch (e: NoSuchAlgorithmException) {
            e.printStackTrace()
        }
        return null
    }

    private fun toHexString(bytes: ByteArray): String {
        val hexString = StringBuilder()
        for (b in bytes) {
            val hex = String.format("%02X", b)  // Convert to uppercase hex
            if (hexString.isNotEmpty()) {
                hexString.append(":")
            }
            hexString.append(hex)
        }
        return hexString.toString()
    }
}
