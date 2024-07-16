import Capacitor

class MockBridge: NSObject, CAPBridgeProtocol {
    
    override init() {
        self.config = InstanceConfiguration()
        self.notificationRouter = Capacitor.NotificationRouter()
        self.isSimEnvironment = true
        self.isDevEnvironment = true
        self.userInterfaceStyle = UIUserInterfaceStyle.light
        self.autoRegisterPlugins = true
        self.statusBarVisible = true
        self.statusBarStyle = UIStatusBarStyle.default
        self.statusBarAnimation = UIStatusBarAnimation.none
    }
    
    var viewController: UIViewController?
    
    var config: InstanceConfiguration
    
    var webView: WKWebView?
    
    var notificationRouter: Capacitor.NotificationRouter
    
    var isSimEnvironment: Bool
    
    var isDevEnvironment: Bool
    
    var userInterfaceStyle: UIUserInterfaceStyle
    
    var autoRegisterPlugins: Bool
    
    var statusBarVisible: Bool
    
    var statusBarStyle: UIStatusBarStyle
    
    var statusBarAnimation: UIStatusBarAnimation
    
    func getWebView() -> WKWebView? {
        nil
    }
    
    func isSimulator() -> Bool {
        return isSimEnvironment
    }
    
    func isDevMode() -> Bool {
        return isDevEnvironment
    }
    
    func getStatusBarVisible() -> Bool {
        return statusBarVisible
    }
    
    func getStatusBarStyle() -> UIStatusBarStyle {
        return statusBarStyle
    }
    
    func getUserInterfaceStyle() -> UIUserInterfaceStyle {
        return userInterfaceStyle
    }
    
    func getLocalUrl() -> String {
        ""
    }
    
    func getSavedCall(_ callbackId: String) -> CAPPluginCall? {
        nil
    }
    
    func releaseCall(callbackId: String) {
    }
    
    func plugin(withName: String) -> CAPPlugin? {
        nil
    }
    
    func saveCall(_ call: CAPPluginCall) {
    }
    
    func savedCall(withID: String) -> CAPPluginCall? {
        nil
    }
    
    func releaseCall(_ call: CAPPluginCall) {
    }
    
    func releaseCall(withID: String) {
    }
    
    func evalWithPlugin(_ plugin: CAPPlugin, js: String) {
    }
    
    func eval(js: String) {
    }
    
    func triggerJSEvent(eventName: String, target: String) {
    }
    
    func triggerJSEvent(eventName: String, target: String, data: String) {
    }
    
    func triggerWindowJSEvent(eventName: String) {
    }
    
    func triggerWindowJSEvent(eventName: String, data: String) {
    }
    
    func triggerDocumentJSEvent(eventName: String) {
    }
    
    func triggerDocumentJSEvent(eventName: String, data: String) {
    }
    
    func localURL(fromWebURL webURL: URL?) -> URL? {
        nil
    }
    
    func portablePath(fromLocalURL localURL: URL?) -> URL? {
        nil
    }
    
    func setServerBasePath(_ path: String) {
    }
    
    func registerPluginType(_ pluginType: CAPPlugin.Type) {
    }
    
    func registerPluginInstance(_ pluginInstance: CAPPlugin) {
    }
    
    func showAlertWith(title: String, message: String, buttonTitle: String) {
    }
    
    func presentVC(_ viewControllerToPresent: UIViewController, animated flag: Bool, completion: (() -> Void)?) {
    }
    
    func dismissVC(animated flag: Bool, completion: (() -> Void)?) {
    }
    

}
