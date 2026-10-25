{
  pkgs ? import <nixpkgs> { },
}:

pkgs.mkShell {
  # Tools (executables) needed for the build process
  nativeBuildInputs = with pkgs.buildPackages; [
    gcc
    pkg-config
	bun
	valkey
  ];

  # Libraries that provide headers and .pc files via pkg-config
  buildInputs = [

  ];
}
