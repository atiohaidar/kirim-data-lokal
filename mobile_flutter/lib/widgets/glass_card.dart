import 'package:flutter/material.dart';

class GlassCard extends StatelessWidget {
  final Widget child;
  final double opacity;
  final double borderOpacity;
  final double borderRadius;
  final EdgeInsets? margin;

  const GlassCard({
    super.key,
    required this.child,
    this.opacity = 0.08,
    this.borderOpacity = 0.1,
    this.borderRadius = 16,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(opacity),
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(
          color: Colors.white.withOpacity(borderOpacity),
        ),
      ),
      child: child,
    );
  }
}
