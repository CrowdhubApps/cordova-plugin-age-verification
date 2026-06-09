import Foundation
import UIKit

#if canImport(DeclaredAgeRange)
import DeclaredAgeRange
#endif

/// Cordova bridge for Apple's Declared Age Range API.
///
/// Normalizes `AgeRangeService.Response` into the shared cross-platform JSON
/// shape so the JavaScript layer can treat Android and iOS uniformly.
@objc(AgeVerificationPlugin)
class AgeVerificationPlugin: CDVPlugin {

    @objc(isSupported:)
    func isSupported(_ command: CDVInvokedUrlCommand) {
        var payload: [String: Any] = ["platform": "ios"]
        if #available(iOS 26.0, *) {
            payload["supported"] = true
        } else {
            payload["supported"] = false
            payload["reason"] = "Declared Age Range API requires iOS 26.0 or later"
        }
        let result = CDVPluginResult(status: .ok, messageAs: payload)
        commandDelegate.send(result, callbackId: command.callbackId)
    }

    @objc(requestAgeRange:)
    func requestAgeRange(_ command: CDVInvokedUrlCommand) {
        guard #available(iOS 26.0, *) else {
            sendNotAvailable(command, reason: "Declared Age Range API requires iOS 26.0 or later")
            return
        }

        #if canImport(DeclaredAgeRange)
        let options = command.argument(at: 0) as? [String: Any]
        let gates = (options?["ageGates"] as? [Int]) ?? [18]
        performRequest(gates: gates, command: command)
        #else
        sendNotAvailable(command, reason: "DeclaredAgeRange framework is unavailable in this build")
        #endif
    }

    #if canImport(DeclaredAgeRange)
    @available(iOS 26.0, *)
    private func performRequest(gates: [Int], command: CDVInvokedUrlCommand) {
        guard let presenter = self.viewController else {
            sendNotAvailable(command, reason: "No presenting view controller is available")
            return
        }

        Task { @MainActor in
            do {
                let response = try await self.requestAgeRange(gates: gates, in: presenter)
                let payload = self.serialize(response)
                let result = CDVPluginResult(status: .ok, messageAs: payload)
                self.commandDelegate.send(result, callbackId: command.callbackId)
            } catch let error as AgeRangeService.Error {
                self.sendNotAvailable(command, reason: self.describe(error), code: self.code(for: error))
            } catch {
                self.sendNotAvailable(command, reason: error.localizedDescription)
            }
        }
    }

    @available(iOS 26.0, *)
    private func requestAgeRange(
        gates: [Int],
        in presenter: UIViewController
    ) async throws -> AgeRangeService.Response {
        let service = AgeRangeService.shared
        switch gates.count {
        case 0:
            return try await service.requestAgeRange(ageGates: 18, in: presenter)
        case 1:
            return try await service.requestAgeRange(ageGates: gates[0], in: presenter)
        case 2:
            return try await service.requestAgeRange(ageGates: gates[0], gates[1], in: presenter)
        default:
            return try await service.requestAgeRange(ageGates: gates[0], gates[1], gates[2], in: presenter)
        }
    }

    @available(iOS 26.0, *)
    private func serialize(_ response: AgeRangeService.Response) -> [String: Any] {
        switch response {
        case .declinedSharing:
            return [
                "platform": "ios",
                "available": false,
                "status": "declined",
                "lowerBound": NSNull(),
                "upperBound": NSNull(),
                "declaration": NSNull(),
                "raw": [
                    "response": "declined",
                    "lowerBound": NSNull(),
                    "upperBound": NSNull(),
                    "declaration": NSNull(),
                    "activeParentalControls": [String]()
                ] as [String: Any]
            ]

        case .sharing(let range):
            let lower: Any = range.lowerBound.map { $0 as Any } ?? NSNull()
            let upper: Any = range.upperBound.map { $0 as Any } ?? NSNull()
            let declaration: Any = self.declarationString(range.ageRangeDeclaration).map { $0 as Any } ?? NSNull()
            let controls = self.parentalControlNames(range.activeParentalControls)

            return [
                "platform": "ios",
                "available": true,
                "status": "sharing",
                "lowerBound": lower,
                "upperBound": upper,
                "declaration": declaration,
                "raw": [
                    "response": "sharing",
                    "lowerBound": lower,
                    "upperBound": upper,
                    "declaration": declaration,
                    "activeParentalControls": controls
                ] as [String: Any]
            ]

        @unknown default:
            return [
                "platform": "ios",
                "available": false,
                "status": "notAvailable",
                "lowerBound": NSNull(),
                "upperBound": NSNull(),
                "declaration": NSNull(),
                "raw": NSNull()
            ]
        }
    }

    @available(iOS 26.0, *)
    private func declarationString(_ declaration: AgeRangeService.AgeRangeDeclaration?) -> String? {
        guard let declaration = declaration else { return nil }
        switch declaration {
        case .selfDeclared:
            return "selfDeclared"
        case .guardianDeclared:
            return "guardianDeclared"
        default:
            // `confirmed` and any future/deprecated scrutinized methods.
            return "confirmed"
        }
    }

    @available(iOS 26.0, *)
    private func parentalControlNames(_ controls: AgeRangeService.ParentalControls) -> [String] {
        var names: [String] = []
        if controls.contains(.ageRange) { names.append("ageRange") }
        return names
    }

    @available(iOS 26.0, *)
    private func describe(_ error: AgeRangeService.Error) -> String {
        switch error {
        case .invalidRequest:
            return "The age-range request was invalid"
        case .notAvailable:
            return "Age-range sharing is not available for this account or region"
        @unknown default:
            return "Age-range request failed"
        }
    }

    @available(iOS 26.0, *)
    private func code(for error: AgeRangeService.Error) -> String {
        switch error {
        case .invalidRequest:
            return "invalidRequest"
        case .notAvailable:
            return "notAvailable"
        @unknown default:
            return "unknown"
        }
    }
    #endif

    private func sendNotAvailable(_ command: CDVInvokedUrlCommand, reason: String, code: String? = nil) {
        var payload: [String: Any] = [
            "platform": "ios",
            "available": false,
            "status": "notAvailable",
            "message": reason
        ]
        if let code = code {
            payload["code"] = code
        }
        let result = CDVPluginResult(status: .error, messageAs: payload)
        commandDelegate.send(result, callbackId: command.callbackId)
    }
}
