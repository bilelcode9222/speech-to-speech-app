//
//  ContentView.swift
//  Nevi
//
//  Created by bilel zouaoui on 25/08/2026.
//

import SwiftUI

struct ContentView: View {
    @Binding var document: NeviDocument

    var body: some View {
        TextEditor(text: $document.text)
    }
}

#Preview {
    ContentView(document: .constant(NeviDocument()))
}
