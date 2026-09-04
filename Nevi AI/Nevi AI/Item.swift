//
//  Item.swift
//  Nevi AI
//
//  Created by bilel zouaoui on 05/09/2026.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date
    
    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}
