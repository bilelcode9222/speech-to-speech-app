import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  /** Côté du carré occupé par le logo, en points */
  size?: number;
  /** Couleur forcée. Par défaut, suit la couleur de texte du thème. */
  color?: string;
}

/**
 * Marque : micro (capsule pleine, arceau, tige, pied).
 *
 * Les coordonnées reprennent les proportions de l'icône de l'app
 * (capsule 0.44×0.78, arceau r=0.40 épaisseur 0.075, pied 0.36×0.075),
 * remises à l'échelle dans un repère 0-100.
 *
 * Le tracé est strictement identique quel que soit le thème : seule la
 * couleur de remplissage change. Aucune compensation optique n'est
 * appliquée — deux versions géométriquement différentes donneraient
 * l'impression de deux logos distincts, ce qui est pire que le léger
 * écart de perception qu'elles corrigeraient.
 */
export function Logo({ size = 28, color }: Props) {
  const { colors } = useTheme();
  const fill = color ?? colors.text;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Capsule */}
      <Rect
        x="32.16"
        y="6"
        width="35.69"
        height="63.26"
        rx="17.84"
        ry="17.84"
        fill={fill}
      />

      {/* Arceau : demi-anneau ouvert vers le haut, tracé comme un contour
          fermé (arc extérieur r=35.48, arc intérieur r=29.4) */}
      <Path
        d="M14.52 51.42
           A35.48 35.48 0 0 0 85.48 51.42
           L79.4 51.42
           A29.4 29.4 0 0 1 20.6 51.42
           Z"
        fill={fill}
      />

      {/* Tige */}
      <Rect x="47.77" y="83.86" width="4.46" height="4.06" fill={fill} />

      {/* Pied */}
      <Rect
        x="35.4"
        y="87.92"
        width="29.2"
        height="6.08"
        rx="3.04"
        ry="3.04"
        fill={fill}
      />
    </Svg>
  );
}
