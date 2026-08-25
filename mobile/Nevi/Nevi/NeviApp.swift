//
//  NeviApp.swift
//  Nevi
//
//  Created by bilel zouaoui on 25/08/2026.
//

import SwiftUI

@main
struct NeviApp: App {
    var body: some Scene {
        DocumentGroup(newDocument: NeviDocument()) { file in
            ContentView(document: file.$document)
        }
    }
}
