# Add project specific ProGuard rules here.
-keepattributes *Annotation*,JavascriptInterface,Signature
-keepclassmembers class io.onegitvault.app.MainActivity$* {
    @android.webkit.JavascriptInterface <methods>;
}
-keepclassmembers class io.onegitvault.app.MainActivity {
    public *;
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-dontwarn android.webkit.**
